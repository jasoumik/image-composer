import React, { useState, useEffect, useRef } from 'react'
import { fabric } from 'fabric'
import UploadZone from './UploadZone'
import TextControls from './TextControls'
import SelectionControls from './SelectionControls'
import { CANVAS_PRESETS } from '../hooks/useCanvas'

interface SidebarProps {
  hasBackground: boolean
  selectedObject: fabric.Object | null
  loadBackground: (file: File) => void
  loadLogo: (file: File) => void
  addText: (text: string, color: string, size: number, fontFamily: string) => void
  removeActive: () => void
  clearCanvas: () => void
  downloadImage: (format: 'png' | 'jpg' | 'webp', quality: number) => void
  applyTextProps: (
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
  ) => void
  applyObjectProps: (props: { opacity?: number; flipX?: boolean; flipY?: boolean }) => void
  flipHorizontal: () => void
  flipVertical: () => void
  bringForward: () => void
  sendBackward: () => void
  duplicateActive: () => void
  applyImageFilters: (brightness: number, contrast: number, saturation: number) => void
  saveImageFilterSnapshot: () => void
  resizeCanvas: (width: number, height: number) => void
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  isCropping: boolean
  startCrop: () => void
  applyCrop: () => void
  cancelCrop: () => void
  toggleLock: () => void
  showGrid: boolean
  toggleGrid: () => void
  setCanvasBgSolid: (color: string) => void
  setCanvasBgGradient: (c1: string, c2: string, angle: number) => void
  addShape: (type: 'rect' | 'circle', fill: string) => void
}

type SectionKey = 'Background' | 'Logo' | 'Text' | 'Shapes' | 'Edit' | 'Canvas'

// ── Chevron icon ──────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-3.5 w-3.5 text-[#8b90a7] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// ── Toolbar icon definitions ──────────────────────────────────────────────────
function BgIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function LogoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}
function TextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}
function ShapesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 9a3 3 0 116 0 3 3 0 01-6 0z" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
    </svg>
  )
}
function CanvasIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  )
}
function UndoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  )
}
function RedoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
    </svg>
  )
}
function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function sectionIcon(key: SectionKey) {
  switch (key) {
    case 'Background': return <BgIcon />
    case 'Logo': return <LogoIcon />
    case 'Text': return <TextIcon />
    case 'Shapes': return <ShapesIcon />
    case 'Edit': return <EditIcon />
    case 'Canvas': return <CanvasIcon />
  }
}

// ── DesktopSection — declared outside Sidebar to satisfy react-hooks/static-components ──
function DesktopSection({
  sectionKey,
  open,
  onToggle,
  getContent,
  getLabel,
  sectionRef,
}: {
  sectionKey: SectionKey
  open: boolean
  onToggle: (key: SectionKey) => void
  getContent: (key: SectionKey) => React.ReactNode
  getLabel: (key: SectionKey) => string
  sectionRef: React.RefObject<HTMLDivElement | null> | undefined
}) {
  return (
    <div ref={sectionRef} className="flex flex-col gap-0">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="flex w-full items-center justify-between py-2.5 group"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8b90a7] group-hover:text-[#b0b4c8] transition-colors">
          {getLabel(sectionKey)}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="pb-4">
          {getContent(sectionKey)}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({
  hasBackground,
  selectedObject,
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
  resizeCanvas,
  canUndo,
  canRedo,
  undo,
  redo,
  isCropping,
  startCrop,
  applyCrop,
  cancelCrop,
  toggleLock,
  showGrid,
  toggleGrid,
  setCanvasBgSolid,
  setCanvasBgGradient,
  addShape,
}: SidebarProps) {
  // ── Desktop: which sections are open ─────────────────────────────────────
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(['Background', 'Logo', 'Text', 'Canvas'])
  )
  const [customW, setCustomW] = useState<string>('1080')
  const [customH, setCustomH] = useState<string>('1080')

  // ── Export format/quality state (Feature 2) ───────────────────────────────
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp'>('png')
  const [exportQuality, setExportQuality] = useState(90)

  // ── Background fill state (Feature 5) ────────────────────────────────────
  const [bgFillTab, setBgFillTab] = useState<'solid' | 'gradient'>('solid')
  const [bgSolidColor, setBgSolidColor] = useState('#1a1d27')
  const [bgGradC1, setBgGradC1] = useState('#6c63ff')
  const [bgGradC2, setBgGradC2] = useState('#1a1d27')
  const [bgGradAngle, setBgGradAngle] = useState<string>('90')

  // ── Shape fill state (Feature 6) ─────────────────────────────────────────
  const [shapeFill, setShapeFill] = useState('#6c63ff')

  // ── Mobile: which drawer is open ─────────────────────────────────────────
  const [activeDrawer, setActiveDrawer] = useState<SectionKey | null>(null)
  const [showExportSheet, setShowExportSheet] = useState(false)
  const editSectionRef = useRef<HTMLDivElement>(null)

  // Keep the last non-null selected object so the Edit section content stays
  // rendered (and the same height) even after Fabric clears selection when the
  // user clicks a sidebar input.
  const [lastSelected, setLastSelected] = useState<fabric.Object | null>(null)
  useEffect(() => {
    if (selectedObject) {
      setLastSelected(selectedObject)
      setOpenSections((prev) => new Set([...prev, 'Edit']))
      setActiveDrawer('Edit')
    }
  }, [selectedObject])

  const toggleDesktopSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const openDrawer = (key: SectionKey) => {
    setActiveDrawer((prev) => (prev === key ? null : key))
  }

  const closeDrawer = () => setActiveDrawer(null)

  // ── Background fill sub-section (Feature 5) ───────────────────────────────
  const bgFillContent = (
    <div className="flex flex-col gap-2 pt-2 border-t border-[#2e3347]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b90a7]">Background Fill</p>
      {/* Tab toggle */}
      <div className="flex gap-1">
        {(['solid', 'gradient'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setBgFillTab(tab)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors touch-manipulation min-h-[36px] capitalize ${
              bgFillTab === tab
                ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
                : 'border-[#2e3347] bg-transparent text-[#8b90a7] hover:bg-[#242736]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {bgFillTab === 'solid' && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1.5 min-h-[40px]">
            <input
              type="color"
              value={bgSolidColor}
              onChange={(e) => setBgSolidColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 touch-manipulation"
              aria-label="Background solid colour"
            />
            <span className="text-xs text-[#8b90a7] font-mono">{bgSolidColor}</span>
          </div>
          <button
            type="button"
            onClick={() => setCanvasBgSolid(bgSolidColor)}
            className="rounded-md bg-[#6c63ff] hover:bg-[#5a52e0] px-3 py-1.5 text-xs font-medium text-white transition-colors touch-manipulation min-h-[40px]"
          >
            Apply
          </button>
        </div>
      )}

      {bgFillTab === 'gradient' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] text-[#8b90a7]">Start</label>
              <div className="flex items-center gap-1.5 rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1 min-h-[36px]">
                <input
                  type="color"
                  value={bgGradC1}
                  onChange={(e) => setBgGradC1(e.target.value)}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0 touch-manipulation"
                  aria-label="Gradient start colour"
                />
                <span className="text-[10px] text-[#8b90a7] font-mono">{bgGradC1}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] text-[#8b90a7]">End</label>
              <div className="flex items-center gap-1.5 rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1 min-h-[36px]">
                <input
                  type="color"
                  value={bgGradC2}
                  onChange={(e) => setBgGradC2(e.target.value)}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0 touch-manipulation"
                  aria-label="Gradient end colour"
                />
                <span className="text-[10px] text-[#8b90a7] font-mono">{bgGradC2}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-[#8b90a7] shrink-0">Angle</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={bgGradAngle}
              onChange={(e) => setBgGradAngle(e.target.value.replace(/\D/g, ''))}
              onFocus={(e) => e.target.select()}
              placeholder="90"
              className="w-16 rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#6c63ff] transition-colors min-h-[36px]"
            />
            <span className="text-xs text-[#8b90a7]">°</span>
            <button
              type="button"
              onClick={() => setCanvasBgGradient(bgGradC1, bgGradC2, Number(bgGradAngle) || 90)}
              className="flex-1 rounded-md bg-[#6c63ff] hover:bg-[#5a52e0] px-3 py-1.5 text-xs font-medium text-white transition-colors touch-manipulation min-h-[36px]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Shared section content ────────────────────────────────────────────────
  const backgroundContent = (
    <div className="flex flex-col gap-2">
      <UploadZone
        accept="image/*"
        label="Click or drag to upload"
        onFile={loadBackground}
        loaded={hasBackground}
      />
      {hasBackground && !isCropping && (
        <button
          type="button"
          onClick={startCrop}
          className="w-full rounded-md border border-[#2e3347] bg-transparent hover:bg-[#242736] px-3 py-2 text-xs font-medium text-[#8b90a7] transition-colors touch-manipulation min-h-[40px]"
        >
          Crop Background
        </button>
      )}
      {isCropping && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyCrop}
            className="flex-1 rounded-md bg-[#43c97e] hover:bg-[#38b36c] px-3 py-2 text-xs font-medium text-white transition-colors touch-manipulation min-h-[40px]"
          >
            Apply Crop
          </button>
          <button
            type="button"
            onClick={cancelCrop}
            className="flex-1 rounded-md border border-[#2e3347] bg-transparent hover:bg-[#242736] px-3 py-2 text-xs font-medium text-[#8b90a7] transition-colors touch-manipulation min-h-[40px]"
          >
            Cancel
          </button>
        </div>
      )}
      {bgFillContent}
    </div>
  )

  const logoContent = (
    <UploadZone
      accept="image/png,image/svg+xml,image/*"
      label="Click or drag to upload"
      sublabel="PNG with transparency works best"
      onFile={loadLogo}
      loaded={false}
    />
  )

  const textContent = <TextControls onAdd={addText} />

  // ── Shapes content (Feature 6) ────────────────────────────────────────────
  const shapesContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#8b90a7]">Fill Colour</label>
        <div className="flex items-center gap-2 rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1.5 min-h-[40px]">
          <input
            type="color"
            value={shapeFill}
            onChange={(e) => setShapeFill(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 touch-manipulation"
            aria-label="Shape fill colour"
          />
          <span className="text-xs text-[#8b90a7] font-mono">{shapeFill}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => addShape('rect', shapeFill)}
          className="flex-1 rounded-md bg-[#0f1117] border border-[#2e3347] hover:border-[#6c63ff]/60 px-3 py-2 text-xs text-[#e8eaf0] transition-colors touch-manipulation min-h-[44px] flex flex-col items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8b90a7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="3" width="18" height="18" rx="1" />
          </svg>
          Rectangle
        </button>
        <button
          type="button"
          onClick={() => addShape('circle', shapeFill)}
          className="flex-1 rounded-md bg-[#0f1117] border border-[#2e3347] hover:border-[#6c63ff]/60 px-3 py-2 text-xs text-[#e8eaf0] transition-colors touch-manipulation min-h-[44px] flex flex-col items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8b90a7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="9" />
          </svg>
          Circle
        </button>
      </div>
    </div>
  )

  // Use lastSelected (not selectedObject) so the Edit panel keeps its height
  // when Fabric clears selection on sidebar input focus — preventing scroll jumps.
  const editContent = lastSelected ? (
    <SelectionControls
      selectedObject={lastSelected}
      onApply={applyTextProps}
      onRemove={removeActive}
      onApplyObjectProps={applyObjectProps}
      onFlipH={flipHorizontal}
      onFlipV={flipVertical}
      onBringForward={bringForward}
      onSendBackward={sendBackward}
      onDuplicate={duplicateActive}
      onApplyImageFilters={applyImageFilters}
      onSaveFilterSnapshot={saveImageFilterSnapshot}
      onToggleLock={toggleLock}
    />
  ) : (
    <p className="text-xs text-[#8b90a7]">Select an element on the canvas to edit it.</p>
  )

  // ── Export format/quality UI (Feature 2) ──────────────────────────────────
  const exportControls = (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {(['png', 'jpg', 'webp'] as const).map((fmt) => (
          <button
            key={fmt}
            type="button"
            onClick={() => setExportFormat(fmt)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium uppercase transition-colors touch-manipulation min-h-[36px] ${
              exportFormat === fmt
                ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
                : 'border-[#2e3347] bg-transparent text-[#8b90a7] hover:bg-[#242736]'
            }`}
          >
            {fmt}
          </button>
        ))}
      </div>
      {exportFormat !== 'png' && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-[#8b90a7]">Quality</label>
            <span className="text-xs text-[#e8eaf0] font-mono w-8 text-right">{exportQuality}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={exportQuality}
            onChange={(e) => setExportQuality(Number(e.target.value))}
            className="w-full accent-[#6c63ff] cursor-pointer"
          />
        </div>
      )}
    </div>
  )

  const canvasContent = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {CANVAS_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setCustomW(String(preset.width))
              setCustomH(String(preset.height))
              resizeCanvas(preset.width, preset.height)
            }}
            className="rounded-md border border-[#2e3347] bg-[#0f1117] hover:border-[#6c63ff]/60 px-2.5 py-1.5 text-[10px] text-[#8b90a7] hover:text-[#e8eaf0] transition-colors touch-manipulation"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={customW}
          onChange={(e) => setCustomW(e.target.value.replace(/\D/g, ''))}
          onFocus={(e) => e.target.select()}
          placeholder="W"
          className="w-0 flex-1 rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1.5 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#6c63ff] transition-colors min-h-[36px]"
        />
        <span className="text-xs text-[#8b90a7]">×</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={customH}
          onChange={(e) => setCustomH(e.target.value.replace(/\D/g, ''))}
          onFocus={(e) => e.target.select()}
          placeholder="H"
          className="w-0 flex-1 rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1.5 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#6c63ff] transition-colors min-h-[36px]"
        />
        <button
          type="button"
          onClick={() => {
            const w = Number(customW)
            const h = Number(customH)
            if (w >= 100 && h >= 100) resizeCanvas(w, h)
          }}
          className="rounded-md bg-[#6c63ff] hover:bg-[#5a52e0] px-3 py-1.5 text-xs font-medium text-white transition-colors touch-manipulation min-h-[36px]"
        >
          Apply
        </button>
      </div>
      {/* Grid toggle (Feature 4) */}
      <button
        type="button"
        onClick={toggleGrid}
        className={`w-full rounded-md border px-3 py-2 text-xs font-medium transition-colors touch-manipulation min-h-[40px] ${
          showGrid
            ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
            : 'border-[#2e3347] bg-transparent text-[#8b90a7] hover:bg-[#242736]'
        }`}
      >
        {showGrid ? 'Hide Grid' : 'Show Grid'}
      </button>
      {/* Export format/quality — shown here so mobile Canvas drawer also has it */}
      <div className="pt-2 border-t border-[#2e3347]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b90a7] mb-2">Export Format</p>
        {exportControls}
      </div>
    </div>
  )

  function getSectionContent(key: SectionKey) {
    switch (key) {
      case 'Background': return backgroundContent
      case 'Logo': return logoContent
      case 'Text': return textContent
      case 'Shapes': return shapesContent
      case 'Edit': return editContent
      case 'Canvas': return canvasContent
    }
  }

  function sectionLabel(key: SectionKey): string {
    switch (key) {
      case 'Background': return 'Background Image'
      case 'Logo': return 'Logo Overlay'
      case 'Text': return 'Add Text'
      case 'Shapes': return 'Shapes'
      case 'Edit': return 'Edit Selected'
      case 'Canvas': return 'Canvas Size'
    }
  }

  // ── Desktop collapsible section ───────────────────────────────────────────
  // Rendered via the DesktopSection component defined outside Sidebar (below)

  // ── Visible toolbar sections on mobile ────────────────────────────────────
  const mobileToolbarSections: SectionKey[] = ['Background', 'Logo', 'Text', 'Shapes', 'Edit', 'Canvas']

  return (
    <>
      {/* ════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (lg+)
          ════════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex h-screen w-72 shrink-0 flex-col border-r border-[#2e3347] bg-[#1a1d27]">

        {/* Brand header */}
        <div className="flex items-center gap-3 border-b border-[#2e3347] px-5 py-4 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6c63ff]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-[#e8eaf0]">Image Composer</h1>
            <p className="text-[11px] text-[#8b90a7]">Upload · Overlay · Export</p>
          </div>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col divide-y divide-[#2e3347]">
          <DesktopSection sectionKey="Background" open={openSections.has('Background')} onToggle={toggleDesktopSection} getContent={getSectionContent} getLabel={sectionLabel} sectionRef={undefined} />
          <DesktopSection sectionKey="Logo" open={openSections.has('Logo')} onToggle={toggleDesktopSection} getContent={getSectionContent} getLabel={sectionLabel} sectionRef={undefined} />
          <DesktopSection sectionKey="Text" open={openSections.has('Text')} onToggle={toggleDesktopSection} getContent={getSectionContent} getLabel={sectionLabel} sectionRef={undefined} />
          <DesktopSection sectionKey="Shapes" open={openSections.has('Shapes')} onToggle={toggleDesktopSection} getContent={getSectionContent} getLabel={sectionLabel} sectionRef={undefined} />
          {/* Always in DOM — conditional unmount causes sidebar height change → scroll jump */}
          <DesktopSection sectionKey="Edit" open={openSections.has('Edit')} onToggle={toggleDesktopSection} getContent={getSectionContent} getLabel={sectionLabel} sectionRef={editSectionRef} />
        </div>

        {/* Canvas size — outside scroll container so focusing inputs never triggers auto-scroll */}
        <div className="shrink-0 border-t border-[#2e3347] px-5 py-2">
          <DesktopSection sectionKey="Canvas" open={openSections.has('Canvas')} onToggle={toggleDesktopSection} getContent={getSectionContent} getLabel={sectionLabel} sectionRef={undefined} />
        </div>

        {/* Fixed footer */}
        <div className="shrink-0 flex flex-col gap-2 border-t border-[#2e3347] px-5 py-4">
          {/* Undo / Redo */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-[#2e3347] bg-transparent hover:bg-[#242736] disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 text-xs font-medium text-[#8b90a7] transition-colors touch-manipulation min-h-[40px]"
            >
              <UndoIcon />
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-[#2e3347] bg-transparent hover:bg-[#242736] disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 text-xs font-medium text-[#8b90a7] transition-colors touch-manipulation min-h-[40px]"
            >
              Redo
              <RedoIcon />
            </button>
          </div>

          <button
            type="button"
            onClick={clearCanvas}
            className="w-full rounded-md border border-[#2e3347] bg-transparent hover:bg-[#242736] px-4 py-2.5 text-sm font-medium text-[#8b90a7] transition-colors touch-manipulation min-h-[44px]"
          >
            Clear Canvas
          </button>

          {/* Export format — desktop footer */}
          {exportControls}

          <button
            type="button"
            onClick={() => downloadImage(exportFormat, exportQuality / 100)}
            disabled={!hasBackground}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-[#43c97e] hover:bg-[#38b36c] active:bg-[#2e9a5d] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors touch-manipulation min-h-[44px]"
          >
            <DownloadIcon />
            Download Image
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════
          MOBILE: bottom toolbar + slide-up drawers (<lg)
          ════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden">

        {/* Backdrop */}
        {activeDrawer !== null && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closeDrawer}
            aria-hidden="true"
          />
        )}

        {/* Slide-up drawer */}
        <div
          className={[
            'fixed bottom-16 left-0 right-0 z-50 flex flex-col bg-[#1a1d27] rounded-t-2xl transition-transform duration-300',
            activeDrawer !== null ? 'translate-y-0' : 'translate-y-full',
          ].join(' ')}
          style={{ maxHeight: '70vh' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-[#2e3347]" />
          </div>

          {/* Drawer header */}
          {activeDrawer && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e3347] shrink-0">
              <div className="flex items-center gap-2 text-[#e8eaf0]">
                <span className="text-[#8b90a7]">{sectionIcon(activeDrawer)}</span>
                <span className="text-sm font-semibold">{sectionLabel(activeDrawer)}</span>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#8b90a7] hover:text-[#e8eaf0] hover:bg-[#242736] transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Drawer content — scrollable */}
          {activeDrawer && (
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {getSectionContent(activeDrawer)}
            </div>
          )}
        </div>

        {/* ── Fixed bottom toolbar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1d27] border-t border-[#2e3347]" style={{ height: '72px' }}>
          <div className="flex items-stretch h-full overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>

            {/* Section tabs */}
            {mobileToolbarSections.map((key) => {
              if (key === 'Edit' && !selectedObject) return null
              const isActive = activeDrawer === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openDrawer(key)}
                  className={[
                    'relative flex shrink-0 flex-col items-center justify-center gap-1 transition-colors touch-manipulation',
                    isActive ? 'text-[#6c63ff]' : 'text-[#8b90a7] hover:text-[#b0b4c8]',
                  ].join(' ')}
                  style={{ minWidth: '68px' }}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[#6c63ff]" />
                  )}
                  {key === 'Edit' && selectedObject && (
                    <span className="absolute top-2 right-3 h-2 w-2 rounded-full bg-[#6c63ff]" />
                  )}
                  <span className="[&>svg]:h-6 [&>svg]:w-6">{sectionIcon(key)}</span>
                  <span className="text-[10px] font-medium leading-none">
                    {key === 'Background' ? 'Bg' : key}
                  </span>
                </button>
              )
            })}

            {/* Divider */}
            <div className="w-px shrink-0 bg-[#2e3347] my-3" />

            {/* Utility actions */}
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo"
              className="flex shrink-0 flex-col items-center justify-center gap-1 text-[#8b90a7] hover:text-[#e8eaf0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation"
              style={{ minWidth: '68px' }}
            >
              <span className="[&>svg]:h-6 [&>svg]:w-6"><UndoIcon /></span>
              <span className="text-[10px] font-medium leading-none">Undo</span>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo"
              className="flex shrink-0 flex-col items-center justify-center gap-1 text-[#8b90a7] hover:text-[#e8eaf0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation"
              style={{ minWidth: '68px' }}
            >
              <span className="[&>svg]:h-6 [&>svg]:w-6"><RedoIcon /></span>
              <span className="text-[10px] font-medium leading-none">Redo</span>
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              title="Clear"
              className="flex shrink-0 flex-col items-center justify-center gap-1 text-[#e05c5c] hover:text-[#f07070] transition-colors touch-manipulation"
              style={{ minWidth: '68px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-[10px] font-medium leading-none">Clear</span>
            </button>
            <button
              type="button"
              onClick={() => setShowExportSheet(true)}
              disabled={!hasBackground}
              title="Download"
              className="flex shrink-0 flex-col items-center justify-center gap-1 text-[#43c97e] hover:text-[#5cd68e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
              style={{ minWidth: '68px' }}
            >
              <span className="[&>svg]:h-6 [&>svg]:w-6"><DownloadIcon /></span>
              <span className="text-[10px] font-medium leading-none">Save</span>
            </button>

          </div>
        </div>

        {/* ── Export sheet — slides up when Save tapped ── */}
        {showExportSheet && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowExportSheet(false)}
              aria-hidden="true"
            />
            <div className="fixed bottom-[72px] left-0 right-0 z-50 bg-[#1a1d27] rounded-t-2xl px-5 py-5 flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#e8eaf0]">Export Options</span>
                <button
                  type="button"
                  onClick={() => setShowExportSheet(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#8b90a7] hover:text-[#e8eaf0] hover:bg-[#242736] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {exportControls}
              <button
                type="button"
                onClick={() => { downloadImage(exportFormat, exportQuality / 100); setShowExportSheet(false) }}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-[#43c97e] hover:bg-[#38b36c] px-4 py-3 text-sm font-semibold text-white transition-colors touch-manipulation min-h-[48px]"
              >
                <span className="[&>svg]:h-5 [&>svg]:w-5"><DownloadIcon /></span>
                Download {exportFormat.toUpperCase()}
              </button>
            </div>
          </>
        )}

      </div>
    </>
  )
}
