import { useEffect, useRef, useState, useCallback } from 'react'
import type { RefObject } from 'react'
import { fabric } from 'fabric'

// ── Patch Fabric IText to fix mobile last-character bug ──────────────────────
// On iOS, exitEditing() sets isEditing=false BEFORE calling blur() on the
// hidden textarea. The last input event fires during blur, but onInput() bails
// early because isEditing is already false → the final character is never
// committed. Fix: read the textarea value into the object right before exit.
;(function patchFabricITextExitEditing() {
  const proto = fabric.IText.prototype as fabric.IText & { updateFromTextArea?: () => void }
  const originalExit = proto.exitEditing
  proto.exitEditing = function (this: fabric.IText & { updateFromTextArea?: () => void; hiddenTextarea?: HTMLTextAreaElement | null }) {
    if (this.hiddenTextarea && this.isEditing && typeof this.updateFromTextArea === 'function') {
      this.updateFromTextArea()
    }
    return originalExit.call(this)
  }
})()

// We store our custom tag directly on the object at runtime.
// Using a WeakSet avoids polluting fabric's type system.
const backgroundObjects = new WeakSet<fabric.Object>()

const STORAGE_KEY = 'image-composer-state'

interface PersistedState {
  canvasJSON: string
  nativeWidth: number
  nativeHeight: number
  displayWidth: number
  displayHeight: number
}

/**
 * Returns max canvas dimensions based on current viewport width.
 * Mobile  (<640):  full width minus small padding, half viewport height
 * Tablet  (640–1023): full width minus padding, most of viewport height
 * Desktop (≥1024): viewport minus sidebar (288px) minus padding
 */
function getMaxDimensions(): { maxW: number; maxH: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (vw < 640) {
    return { maxW: vw - 16, maxH: Math.round(vh * 0.52) }
  }
  if (vw < 1024) {
    return { maxW: vw - 32, maxH: Math.round(vh * 0.62) }
  }
  // Desktop: sidebar is w-72 = 288px; add 48px padding
  return { maxW: vw - 288 - 48, maxH: vh - 48 }
}

/** Canvas size preset definition */
export interface CanvasSizePreset {
  label: string
  width: number
  height: number
}

export const CANVAS_PRESETS: CanvasSizePreset[] = [
  { label: '1:1 (1080×1080)', width: 1080, height: 1080 },
  { label: '16:9 (1920×1080)', width: 1920, height: 1080 },
  { label: '4:5 (1080×1350)', width: 1080, height: 1350 },
  { label: 'Story (1080×1920)', width: 1080, height: 1920 },
  { label: 'Twitter (1500×500)', width: 1500, height: 500 },
]

/**
 * All Fabric.js canvas logic lives here.
 * Returned values are consumed by App.tsx and passed down to components.
 */
export function useCanvas(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [hasBackground, setHasBackground] = useState(false)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [showGrid, setShowGrid] = useState(false)

  // Native (full-resolution) dimensions of the composition.
  // The canvas is scaled down to fit the viewport for display, but we export
  // at these native dimensions for HD quality output.
  const nativeSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })

  // Keep a ref to canvas for use inside event callbacks without stale closures
  const canvasInstanceRef = useRef<fabric.Canvas | null>(null)

  // Ref to track the bg fill gradient rect (Feature 5)
  const bgFillRectRef = useRef<fabric.Rect | null>(null)

  // Smart alignment guides: stores lines to draw after each render
  const guideLinesRef = useRef<{ x?: number; y?: number }[]>([])

  // ── History refs ────────────────────────────────────────────────────────
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)
  // suppressSnapshotRef is used only during undo/redo restore to block any
  // accidental explicit saveSnapshot calls — no longer tied to canvas events
  const suppressSnapshotRef = useRef<boolean>(false)

  // ── Crop state ──────────────────────────────────────────────────────────
  const [isCropping, setIsCropping] = useState(false)
  const cropRectRef = useRef<fabric.Rect | null>(null)

  // ── Initialise Fabric canvas on mount ────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return

    const fc = new fabric.Canvas(canvasRef.current, {
      backgroundColor: '#1a1d27',
      selection: true,
      preserveObjectStacking: true,
    })

    canvasInstanceRef.current = fc
    setCanvas(fc)

    // Track selected object for SelectionControls
    fc.on('selection:created', (e) => setSelectedObject(e.selected?.[0] ?? null))
    fc.on('selection:updated', (e) => setSelectedObject(e.selected?.[0] ?? null))
    fc.on('selection:cleared', () => setSelectedObject(null))

    // ── Fix: mobile IText last-letter bug ───────────────────────────────────
    // On mobile virtual keyboards, the final character typed may not be
    // committed before Fabric exits editing mode. Force a render + snapshot
    // when editing exits so the text is always saved correctly.
    fc.on('text:editing:exited', () => {
      fc.renderAll()
      if (!suppressSnapshotRef.current) {
        const json = JSON.stringify(fc.toJSON(['_isBackground', '_isLocked', '_isBgFill']))
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
        historyRef.current.push(json)
        if (historyRef.current.length > 30) {
          historyRef.current.shift()
        } else {
          historyIndexRef.current++
        }
        setCanUndo(historyIndexRef.current > 0)
        setCanRedo(false)
        try {
          const state = {
            canvasJSON: json,
            nativeWidth: nativeSizeRef.current.width,
            nativeHeight: nativeSizeRef.current.height,
            displayWidth: fc.getWidth(),
            displayHeight: fc.getHeight(),
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch { /* quota — fail silently */ }
      }
    })

    // ── Smart alignment guides ───────────────────────────────────────────────
    const SNAP_THRESHOLD = 8

    fc.on('object:moving', (e) => {
      const obj = e.target
      if (!obj) return

      const cw = fc.getWidth()
      const ch = fc.getHeight()
      const br = obj.getBoundingRect(true)
      const objCX = br.left + br.width / 2
      const objCY = br.top + br.height / 2

      const guides: { x?: number; y?: number }[] = []

      // Snap + guide: canvas horizontal center
      if (Math.abs(objCX - cw / 2) < SNAP_THRESHOLD) {
        guides.push({ x: cw / 2 })
        obj.set({ left: (obj.left ?? 0) + (cw / 2 - objCX) })
        obj.setCoords()
      }

      // Snap + guide: canvas vertical center
      if (Math.abs(objCY - ch / 2) < SNAP_THRESHOLD) {
        guides.push({ y: ch / 2 })
        obj.set({ top: (obj.top ?? 0) + (ch / 2 - objCY) })
        obj.setCoords()
      }

      // Guide: left edge
      if (Math.abs(br.left) < SNAP_THRESHOLD) {
        guides.push({ x: 0 })
        obj.set({ left: (obj.left ?? 0) - br.left })
        obj.setCoords()
      }

      // Guide: right edge
      if (Math.abs(br.left + br.width - cw) < SNAP_THRESHOLD) {
        guides.push({ x: cw })
        obj.set({ left: (obj.left ?? 0) + (cw - (br.left + br.width)) })
        obj.setCoords()
      }

      // Guide: top edge
      if (Math.abs(br.top) < SNAP_THRESHOLD) {
        guides.push({ y: 0 })
        obj.set({ top: (obj.top ?? 0) - br.top })
        obj.setCoords()
      }

      // Guide: bottom edge
      if (Math.abs(br.top + br.height - ch) < SNAP_THRESHOLD) {
        guides.push({ y: ch })
        obj.set({ top: (obj.top ?? 0) + (ch - (br.top + br.height)) })
        obj.setCoords()
      }

      guideLinesRef.current = guides
    })

    fc.on('mouse:up', () => {
      if (guideLinesRef.current.length > 0) {
        guideLinesRef.current = []
        fc.renderAll()
      }
    })

    // Draw guide lines on the canvas context after each render
    fc.on('after:render', () => {
      const guides = guideLinesRef.current
      if (guides.length === 0) return
      const ctx = fc.getContext()
      const cw = fc.getWidth()
      const ch = fc.getHeight()
      ctx.save()
      ctx.strokeStyle = '#00d4ff'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.globalAlpha = 0.85
      guides.forEach((g) => {
        ctx.beginPath()
        if (g.x !== undefined) {
          ctx.moveTo(g.x, 0)
          ctx.lineTo(g.x, ch)
        }
        if (g.y !== undefined) {
          ctx.moveTo(0, g.y)
          ctx.lineTo(cw, g.y)
        }
        ctx.stroke()
      })
      ctx.restore()
    })

    // NOTE: No canvas event listeners for saveSnapshot — snapshots are saved
    // explicitly at the end of each user action to avoid async race conditions
    // with Fabric v5's asynchronous image loading in loadFromJSON.

    return () => {
      fc.dispose()
      canvasInstanceRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore persisted state on first mount ───────────────────────────────
  useEffect(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const { canvasJSON, nativeWidth, nativeHeight, displayWidth, displayHeight } =
        JSON.parse(raw) as PersistedState

      // Size the canvas to match what was saved before loading objects
      fc.setWidth(displayWidth)
      fc.setHeight(displayHeight)
      nativeSizeRef.current = { width: nativeWidth, height: nativeHeight }

      suppressSnapshotRef.current = true
      fc.loadFromJSON(canvasJSON, () => {
        fc.getObjects().forEach((o) => {
          const obj = o as fabric.Object & { _isBackground?: boolean; _isLocked?: boolean; _isBgFill?: boolean }
          if (obj._isBackground) {
            backgroundObjects.add(o)
            o.set({ selectable: false, evented: false, hoverCursor: 'default' })
          }
          if (obj._isLocked) {
            o.set({ lockMovementX: true, lockMovementY: true, lockRotation: true, lockScalingX: true, lockScalingY: true, hasControls: false })
          }
          if (obj._isBgFill) {
            o.set({ selectable: false, evented: false, hoverCursor: 'default' })
            bgFillRectRef.current = o as fabric.Rect
          }
        })
        fc.renderAll()
        suppressSnapshotRef.current = false

        const hasbg = fc.getObjects().some((o) => backgroundObjects.has(o))
        setHasBackground(hasbg)

        // Seed history with the restored snapshot so undo/redo starts correctly
        historyRef.current = [canvasJSON]
        historyIndexRef.current = 0
        setCanUndo(false)
        setCanRedo(false)
      })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [canvas]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── History helpers ──────────────────────────────────────────────────────
  const saveSnapshot = useCallback((fc: fabric.Canvas) => {
    if (suppressSnapshotRef.current) return
    const json = JSON.stringify(fc.toJSON(['_isBackground', '_isLocked', '_isBgFill']))
    // Truncate forward history on new action
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(json)
    if (historyRef.current.length > 30) {
      historyRef.current.shift()
    } else {
      historyIndexRef.current++
    }
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(false)

    // Persist current state to localStorage so it survives page reloads
    try {
      const state: PersistedState = {
        canvasJSON: json,
        nativeWidth: nativeSizeRef.current.width,
        nativeHeight: nativeSizeRef.current.height,
        displayWidth: fc.getWidth(),
        displayHeight: fc.getHeight(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage can be unavailable (private browsing quota) — fail silently
    }
  }, [])

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  const restoreFromSnapshot = useCallback((json: string, onDone?: () => void) => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    suppressSnapshotRef.current = true
    fc.loadFromJSON(json, () => {
      // Re-lock background objects after restore
      fc.getObjects().forEach((o) => {
        const obj = o as fabric.Object & { _isBackground?: boolean; _isLocked?: boolean; _isBgFill?: boolean }
        if (obj._isBackground) {
          backgroundObjects.add(o)
          o.set({ selectable: false, evented: false, hoverCursor: 'default' })
        }
        if (obj._isLocked) {
          o.set({ lockMovementX: true, lockMovementY: true, lockRotation: true, lockScalingX: true, lockScalingY: true, hasControls: false })
        }
        if (obj._isBgFill) {
          o.set({ selectable: false, evented: false, hoverCursor: 'default' })
          bgFillRectRef.current = o as fabric.Rect
        }
      })
      fc.renderAll()
      suppressSnapshotRef.current = false
      setHasBackground(fc.getObjects().some((o) => backgroundObjects.has(o)))
      setSelectedObject(null)
      onDone?.()
    })
  }, [])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current--
    restoreFromSnapshot(historyRef.current[historyIndexRef.current], () => {
      updateHistoryState()
    })
  }, [restoreFromSnapshot, updateHistoryState])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current++
    restoreFromSnapshot(historyRef.current[historyIndexRef.current], () => {
      updateHistoryState()
    })
  }, [restoreFromSnapshot, updateHistoryState])

  // ── Helper: compute canvas size that fits the viewport ───────────────────
  const computeCanvasSize = useCallback((imgWidth: number, imgHeight: number) => {
    const { maxW, maxH } = getMaxDimensions()
    const ratio = Math.min(maxW / imgWidth, maxH / imgHeight, 1)
    return { width: Math.round(imgWidth * ratio), height: Math.round(imgHeight * ratio) }
  }, [])

  // ── Load background image ─────────────────────────────────────────────────
  // Uses FileReader to get a data URL — blob URLs are revoked after load and
  // cannot be restored from JSON snapshots, which would break undo/redo.
  const loadBackground = useCallback((file: File) => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) return

      fabric.Image.fromURL(dataUrl, (img: fabric.Image) => {
        const naturalW = img.width ?? 800
        const naturalH = img.height ?? 600
        const { width, height } = computeCanvasSize(naturalW, naturalH)

        fc.setWidth(width)
        fc.setHeight(height)

        img.set({
          left: 0,
          top: 0,
          scaleX: width / naturalW,
          scaleY: height / naturalH,
          selectable: false,
          evented: false,
          hoverCursor: 'default',
        })

        backgroundObjects.add(img)
        ;(img as fabric.Object & { _isBackground?: boolean })._isBackground = true

        const existing = fc.getObjects().find((o) => backgroundObjects.has(o))
        if (existing) fc.remove(existing)

        fc.insertAt(img, 0, false)
        fc.renderAll()
        setHasBackground(true)
        // Store original image dimensions for HD export
        nativeSizeRef.current = { width: naturalW, height: naturalH }
        saveSnapshot(fc)
      })
    }
    reader.readAsDataURL(file)
  }, [computeCanvasSize, saveSnapshot])

  // ── Load logo overlay ─────────────────────────────────────────────────────
  // Uses FileReader for data URL — same reason as loadBackground (undo safety).
  const loadLogo = useCallback((file: File) => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) return

      fabric.Image.fromURL(dataUrl, (img: fabric.Image) => {
        const canvasW = fc.getWidth()
        const targetW = canvasW * 0.3
        const scale = targetW / (img.width ?? targetW)

        img.set({
          left: canvasW / 2 - (img.width ?? 0) * scale / 2,
          top: fc.getHeight() / 2 - (img.height ?? 0) * scale / 2,
          scaleX: scale,
          scaleY: scale,
          lockUniScaling: true,
        })

        img.on('scaling', function (this: fabric.Image) {
          const sx = this.scaleX ?? 1
          const sy = this.scaleY ?? 1
          if (Math.abs(sx - sy) > 0.0001) {
            const uniform = Math.max(sx, sy)
            this.set({ scaleX: uniform, scaleY: uniform })
          }
        })

        fc.add(img)
        fc.setActiveObject(img)
        fc.renderAll()
        saveSnapshot(fc)
      })
    }
    reader.readAsDataURL(file)
  }, [saveSnapshot])

  // ── Add text ──────────────────────────────────────────────────────────────
  const addText = useCallback((text: string, color: string, size: number, fontFamily = 'Poppins') => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    const itext = new fabric.IText(text, {
      left: fc.getWidth() / 2,
      top: fc.getHeight() / 2,
      originX: 'center',
      originY: 'center',
      fontSize: size,
      fill: color,
      fontFamily,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.4)', blur: 6, offsetX: 2, offsetY: 2 }),
    })

    fc.add(itext)
    fc.setActiveObject(itext)
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Remove selected object (guard against background) ────────────────────
  const removeActive = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    const active = fc.getActiveObject()
    if (!active || backgroundObjects.has(active)) return

    // Don't remove while the user is typing inside an IText
    if ((active as fabric.IText).isEditing) return

    fc.remove(active)
    fc.discardActiveObject()
    fc.renderAll()
    setSelectedObject(null)
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Clear entire canvas ───────────────────────────────────────────────────
  const clearCanvas = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    fc.clear()
    fc.backgroundColor = '#1a1d27'
    fc.renderAll()
    setHasBackground(false)
    setSelectedObject(null)
    bgFillRectRef.current = null
    // Reset history
    historyRef.current = []
    historyIndexRef.current = -1
    setCanUndo(false)
    setCanRedo(false)
    // Remove persisted state so a reload starts fresh
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // ── Download image (Feature 2: format + quality) ──────────────────────────
  const downloadImage = useCallback((format: 'png' | 'jpg' | 'webp' = 'png', quality = 1) => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    fc.discardActiveObject()
    fc.renderAll()

    const displayW = fc.getWidth()
    const { width: nativeW } = nativeSizeRef.current
    const multiplier = nativeW > 0 ? nativeW / displayW : 1

    let dataUrl: string
    if (format === 'webp') {
      // Fabric doesn't support webp natively — use the underlying canvas element
      const el = fc.getElement()
      const temp = document.createElement('canvas')
      temp.width = Math.round(displayW * multiplier)
      temp.height = Math.round(fc.getHeight() * multiplier)
      const ctx = temp.getContext('2d')!
      ctx.drawImage(el, 0, 0, temp.width, temp.height)
      dataUrl = temp.toDataURL('image/webp', quality)
    } else {
      dataUrl = fc.toDataURL({ format: format === 'jpg' ? 'jpeg' : 'png', quality, multiplier })
    }

    const ext = format === 'jpg' ? 'jpg' : format
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${ts}.${ext}`
    link.click()
  }, [])

  // ── Apply text properties to selected IText ───────────────────────────────
  const applyTextProps = useCallback((
    color: string,
    size: number,
    fontFamily?: string,
    extra?: {
      opacity?: number
      fontWeight?: string
      fontStyle?: string
      textAlign?: string
      charSpacing?: number
      stroke?: string
      strokeWidth?: number
    }
  ) => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    const active = fc.getActiveObject()
    if (!active || !(active instanceof fabric.IText)) return

    const updates: Partial<fabric.IText> = { fill: color, fontSize: size }
    if (fontFamily) updates.fontFamily = fontFamily
    if (extra?.opacity !== undefined) updates.opacity = extra.opacity
    if (extra?.fontWeight !== undefined) updates.fontWeight = extra.fontWeight
    if (extra?.fontStyle !== undefined) updates.fontStyle = extra.fontStyle as '' | 'normal' | 'italic' | 'oblique' | undefined
    if (extra?.textAlign !== undefined) updates.textAlign = extra.textAlign
    if (extra?.charSpacing !== undefined) updates.charSpacing = extra.charSpacing
    if (extra?.stroke !== undefined) updates.stroke = extra.stroke
    if (extra?.strokeWidth !== undefined) updates.strokeWidth = extra.strokeWidth
    active.set(updates)
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Apply generic object properties (opacity, etc.) ───────────────────────
  const applyObjectProps = useCallback((props: {
    opacity?: number
    flipX?: boolean
    flipY?: boolean
  }) => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    const active = fc.getActiveObject()
    if (!active) return

    active.set(props as Partial<fabric.Object>)
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Flip selected image ───────────────────────────────────────────────────
  const flipHorizontal = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active) return
    active.set({ flipX: !active.flipX })
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  const flipVertical = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active) return
    active.set({ flipY: !active.flipY })
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Layer ordering ────────────────────────────────────────────────────────
  const bringForward = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active || backgroundObjects.has(active)) return
    fc.bringForward(active)
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  const sendBackward = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active || backgroundObjects.has(active)) return
    fc.sendBackwards(active)
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const duplicateActive = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active || backgroundObjects.has(active)) return

    active.clone((cloned: fabric.Object) => {
      cloned.set({
        left: (cloned.left ?? 0) + 20,
        top: (cloned.top ?? 0) + 20,
        evented: true,
      })
      fc.add(cloned)
      fc.setActiveObject(cloned)
      fc.renderAll()
      saveSnapshot(fc)
    })
  }, [saveSnapshot])

  // ── Image filters (live preview — no snapshot, call saveImageFilterSnapshot on release) ──
  const applyImageFilters = useCallback((brightness: number, contrast: number, saturation: number) => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active || !(active instanceof fabric.Image)) return

    const img = active as fabric.Image
    const filters: fabric.IBaseFilter[] = []

    if (brightness !== 0) {
      filters.push(new fabric.Image.filters.Brightness({ brightness }))
    }
    if (contrast !== 0) {
      filters.push(new fabric.Image.filters.Contrast({ contrast }))
    }
    if (saturation !== 0) {
      filters.push(new fabric.Image.filters.Saturation({ saturation }))
    }

    img.filters = filters
    img.applyFilters()
    fc.renderAll()
  }, [])

  // ── Save snapshot after filter slider released ────────────────────────────
  const saveImageFilterSnapshot = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    saveSnapshot(fc)
  }, [saveSnapshot])

  // Also apply filters to background image
  const applyBackgroundFilters = useCallback((brightness: number, contrast: number, saturation: number) => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const bg = fc.getObjects().find((o) => backgroundObjects.has(o)) as fabric.Image | undefined
    if (!bg) return

    const filters: fabric.IBaseFilter[] = []

    if (brightness !== 0) {
      filters.push(new fabric.Image.filters.Brightness({ brightness }))
    }
    if (contrast !== 0) {
      filters.push(new fabric.Image.filters.Contrast({ contrast }))
    }
    if (saturation !== 0) {
      filters.push(new fabric.Image.filters.Saturation({ saturation }))
    }

    bg.filters = filters
    bg.applyFilters()
    fc.renderAll()
  }, [])

  // ── Resize canvas to preset/custom dimensions ─────────────────────────────
  const resizeCanvas = useCallback((targetW: number, targetH: number) => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    // Scale everything proportionally
    const prevW = fc.getWidth()
    const prevH = fc.getHeight()

    // Compute display size that fits viewport
    const { maxW, maxH } = getMaxDimensions()
    const ratio = Math.min(maxW / targetW, maxH / targetH, 1)
    const displayW = Math.round(targetW * ratio)
    const displayH = Math.round(targetH * ratio)

    const scaleRatioX = displayW / prevW
    const scaleRatioY = displayH / prevH

    fc.setWidth(displayW)
    fc.setHeight(displayH)

    // Rescale and reposition all non-background objects
    fc.getObjects().forEach((obj) => {
      if (backgroundObjects.has(obj)) {
        // Scale background to cover the new dimensions (object-fit: cover)
        const bgImg = obj as fabric.Image
        const naturalW = bgImg.width ?? 1
        const naturalH = bgImg.height ?? 1
        const coverScale = Math.max(displayW / naturalW, displayH / naturalH)
        const newLeft = (displayW - naturalW * coverScale) / 2
        const newTop = (displayH - naturalH * coverScale) / 2
        bgImg.set({ scaleX: coverScale, scaleY: coverScale, left: newLeft, top: newTop })
        bgImg.setCoords()
        return
      }
      obj.set({
        left: (obj.left ?? 0) * scaleRatioX,
        top: (obj.top ?? 0) * scaleRatioY,
        scaleX: (obj.scaleX ?? 1) * scaleRatioX,
        scaleY: (obj.scaleY ?? 1) * scaleRatioY,
      })
      obj.setCoords()
    })

    fc.renderAll()
    // Update native size so HD export reflects the chosen preset/custom dimensions
    nativeSizeRef.current = { width: targetW, height: targetH }
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Crop background ───────────────────────────────────────────────────────
  const startCrop = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return

    const canvasW = fc.getWidth()
    const canvasH = fc.getHeight()
    const padding = 20

    const cropRect = new fabric.Rect({
      left: padding,
      top: padding,
      width: canvasW - padding * 2,
      height: canvasH - padding * 2,
      fill: 'rgba(0,0,0,0)',
      stroke: '#6c63ff',
      strokeWidth: 2,
      strokeDashArray: [6, 4],
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    })

    // Overlay to dim background
    const overlay = new fabric.Rect({
      left: 0,
      top: 0,
      width: canvasW,
      height: canvasH,
      fill: 'rgba(0,0,0,0.5)',
      selectable: false,
      evented: false,
    })
    ;(overlay as fabric.Object & { _isCropOverlay?: boolean })._isCropOverlay = true

    fc.add(overlay)
    fc.add(cropRect)
    fc.setActiveObject(cropRect)
    cropRectRef.current = cropRect
    fc.renderAll()
    setIsCropping(true)
  }, [])

  const applyCrop = useCallback(() => {
    const fc = canvasInstanceRef.current
    const cropRect = cropRectRef.current
    if (!fc || !cropRect) return

    const left = cropRect.left ?? 0
    const top = cropRect.top ?? 0
    const width = (cropRect.width ?? 100) * (cropRect.scaleX ?? 1)
    const height = (cropRect.height ?? 100) * (cropRect.scaleY ?? 1)

    // Remove crop UI objects
    const overlay = fc.getObjects().find(
      (o) => (o as fabric.Object & { _isCropOverlay?: boolean })._isCropOverlay
    )
    if (overlay) fc.remove(overlay)
    fc.remove(cropRect)
    cropRectRef.current = null
    fc.discardActiveObject()
    fc.renderAll()

    // Export only the cropped region as data URL
    const dataUrl = fc.toDataURL({
      format: 'png',
      left,
      top,
      width,
      height,
      multiplier: 1,
    })

    // Reload as new background
    fabric.Image.fromURL(dataUrl, (img: fabric.Image) => {
      if (!fc) return
      const naturalW = img.width ?? 800
      const naturalH = img.height ?? 600

      const { maxW, maxH } = getMaxDimensions()
      const ratio = Math.min(maxW / naturalW, maxH / naturalH, 1)
      const newDisplayW = Math.round(naturalW * ratio)
      const newDisplayH = Math.round(naturalH * ratio)

      fc.setWidth(newDisplayW)
      fc.setHeight(newDisplayH)

      const scaleX = newDisplayW / naturalW
      const scaleY = newDisplayH / naturalH

      img.set({ left: 0, top: 0, scaleX, scaleY, selectable: false, evented: false, hoverCursor: 'default' })
      backgroundObjects.add(img)
      ;(img as fabric.Object & { _isBackground?: boolean })._isBackground = true

      const existing = fc.getObjects().find((o) => backgroundObjects.has(o))
      if (existing) fc.remove(existing)

      fc.insertAt(img, 0, false)
      fc.renderAll()
      setIsCropping(false)
      setHasBackground(true)
      saveSnapshot(fc)
    })
  }, [saveSnapshot])

  const cancelCrop = useCallback(() => {
    const fc = canvasInstanceRef.current
    const cropRect = cropRectRef.current
    if (!fc) return

    if (cropRect) {
      fc.remove(cropRect)
      cropRectRef.current = null
    }
    const overlay = fc.getObjects().find(
      (o) => (o as fabric.Object & { _isCropOverlay?: boolean })._isCropOverlay
    )
    if (overlay) fc.remove(overlay)
    fc.discardActiveObject()
    fc.renderAll()
    setIsCropping(false)
  }, [])

  // ── Feature 1: Keyboard Nudge ─────────────────────────────────────────────
  const nudgeActive = useCallback((dx: number, dy: number) => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active || backgroundObjects.has(active)) return
    active.set({ left: (active.left ?? 0) + dx, top: (active.top ?? 0) + dy })
    active.setCoords()
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Feature 3: Lock Object ────────────────────────────────────────────────
  const toggleLock = useCallback(() => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active || backgroundObjects.has(active)) return
    const locked = !!(active as fabric.Object & { _isLocked?: boolean })._isLocked
    if (locked) {
      active.set({
        lockMovementX: false, lockMovementY: false,
        lockRotation: false, lockScalingX: false, lockScalingY: false,
        hasControls: true,
      })
      ;(active as fabric.Object & { _isLocked?: boolean })._isLocked = false
    } else {
      active.set({
        lockMovementX: true, lockMovementY: true,
        lockRotation: true, lockScalingX: true, lockScalingY: true,
        hasControls: false,
      })
      ;(active as fabric.Object & { _isLocked?: boolean })._isLocked = true
    }
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Feature 4: Grid Toggle ────────────────────────────────────────────────
  const toggleGrid = useCallback(() => setShowGrid(prev => !prev), [])

  // ── Feature 5: Solid Background Color ────────────────────────────────────
  const setCanvasBgSolid = useCallback((color: string) => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    // Remove any existing gradient rect
    if (bgFillRectRef.current) {
      fc.remove(bgFillRectRef.current)
      bgFillRectRef.current = null
    }
    fc.backgroundColor = color
    fc.renderAll()
    setHasBackground(true)
    if (nativeSizeRef.current.width === 0) {
      nativeSizeRef.current = { width: fc.getWidth(), height: fc.getHeight() }
    }
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Feature 5: Gradient Background Color ─────────────────────────────────
  const setCanvasBgGradient = useCallback((c1: string, c2: string, angle: number) => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    fc.backgroundColor = ''
    // Remove old gradient rect
    if (bgFillRectRef.current) fc.remove(bgFillRectRef.current)

    const w = fc.getWidth()
    const h = fc.getHeight()
    const rad = (angle * Math.PI) / 180
    const gradient = new fabric.Gradient({
      type: 'linear',
      gradientUnits: 'pixels',
      coords: {
        x1: w / 2 - Math.cos(rad) * w / 2,
        y1: h / 2 - Math.sin(rad) * h / 2,
        x2: w / 2 + Math.cos(rad) * w / 2,
        y2: h / 2 + Math.sin(rad) * h / 2,
      },
      colorStops: [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 },
      ],
    })

    const rect = new fabric.Rect({
      left: 0, top: 0, width: w, height: h,
      fill: gradient,
      selectable: false, evented: false, hoverCursor: 'default',
    })
    ;(rect as fabric.Object & { _isBgFill?: boolean })._isBgFill = true
    bgFillRectRef.current = rect
    fc.insertAt(rect, 0, false)
    fc.renderAll()
    setHasBackground(true)
    if (nativeSizeRef.current.width === 0) {
      nativeSizeRef.current = { width: w, height: h }
    }
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Feature 6: Add Shape ──────────────────────────────────────────────────
  const addShape = useCallback((type: 'rect' | 'circle', fill: string) => {
    const fc = canvasInstanceRef.current
    if (!fc) return
    const cx = fc.getWidth() / 2
    const cy = fc.getHeight() / 2
    const size = Math.min(fc.getWidth(), fc.getHeight()) * 0.25

    let shape: fabric.Object
    if (type === 'rect') {
      shape = new fabric.Rect({
        left: cx - size / 2, top: cy - size / 2,
        width: size, height: size,
        fill, rx: 0, ry: 0,
      })
    } else {
      shape = new fabric.Ellipse({
        left: cx - size / 2, top: cy - size / 2,
        rx: size / 2, ry: size / 2,
        fill,
      })
    }

    fc.add(shape)
    fc.setActiveObject(shape)
    fc.renderAll()
    saveSnapshot(fc)
  }, [saveSnapshot])

  // ── Window resize handler (debounced, re-scales background) ──────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const handleResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const fc = canvasInstanceRef.current
        if (!fc) return

        const bg = fc.getObjects().find((o) => backgroundObjects.has(o)) as fabric.Image | undefined
        if (!bg) return

        const currentW = (bg.width ?? 1) * (bg.scaleX ?? 1)
        const currentH = (bg.height ?? 1) * (bg.scaleY ?? 1)

        const { width: newW, height: newH } = computeCanvasSize(currentW, currentH)

        const ratioX = newW / fc.getWidth()
        const ratioY = newH / fc.getHeight()

        fc.setWidth(newW)
        fc.setHeight(newH)

        // Rescale background
        bg.set({ scaleX: (bg.scaleX ?? 1) * ratioX, scaleY: (bg.scaleY ?? 1) * ratioY })

        // Rescale all other objects proportionally
        fc.getObjects().forEach((obj) => {
          if (backgroundObjects.has(obj)) return
          obj.set({
            left: (obj.left ?? 0) * ratioX,
            top: (obj.top ?? 0) * ratioY,
            scaleX: (obj.scaleX ?? 1) * ratioX,
            scaleY: (obj.scaleY ?? 1) * ratioY,
          })
          obj.setCoords()
        })

        fc.renderAll()
      }, 200)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timer)
    }
  }, [computeCanvasSize])

  return {
    canvas,
    hasBackground,
    selectedObject,
    canUndo,
    canRedo,
    undo,
    redo,
    loadBackground,
    loadLogo,
    addText,
    removeActive,
    clearCanvas,
    downloadImage,
    applyTextProps,
    applyObjectProps,
    flipHorizontal,
    flipVertical,
    bringForward,
    sendBackward,
    duplicateActive,
    applyImageFilters,
    saveImageFilterSnapshot,
    applyBackgroundFilters,
    resizeCanvas,
    isCropping,
    startCrop,
    applyCrop,
    cancelCrop,
    nudgeActive,
    toggleLock,
    showGrid,
    toggleGrid,
    setCanvasBgSolid,
    setCanvasBgGradient,
    addShape,
  }
}
