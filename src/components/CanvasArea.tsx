import { useEffect } from 'react'
import type { RefObject } from 'react'
import { fabric } from 'fabric'

// Extend to access our custom background tag
interface FabricObjectWithBackground extends fabric.Object {
  _isBackground?: boolean
}

interface CanvasAreaProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  hasBackground: boolean
  selectedObject: fabric.Object | null
  removeActive: () => void
  canvas: fabric.Canvas | null
}

/**
 * The main canvas display area.
 * – Shows a placeholder when no background has been loaded.
 * – Shows the Fabric canvas when a background is present.
 * – Attaches a keydown listener so Delete/Backspace removes the selected object.
 */
export default function CanvasArea({
  canvasRef,
  hasBackground,
  selectedObject,
  removeActive,
  canvas,
}: CanvasAreaProps) {

  // Keyboard shortcut: Delete / Backspace removes selected object
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return

      // Don't remove while the user is typing inside an IText
      const active = canvas?.getActiveObject() as FabricObjectWithBackground | null
      if (active && (active as fabric.IText).isEditing) return

      // Don't remove if focus is inside a regular input/textarea
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      removeActive()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canvas, removeActive])

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-auto bg-[#0f1117] min-h-0">

      {/* ── Placeholder (no background loaded) ────────────────────── */}
      {!hasBackground && (
        <div className="pointer-events-none flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[#2e3347] px-16 py-14 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#2e3347]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-[#8b90a7]">Upload a background image to get started</p>
        </div>
      )}

      {/* ── Canvas wrapper ─────────────────────────────────────────── */}
      <div
        className={[
          'transition-opacity duration-300 max-w-full',
          hasBackground ? 'opacity-100' : 'opacity-0 pointer-events-none absolute',
        ].join(' ')}
        style={{
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* ── Selection hint bar + floating delete button ──────────────── */}
      {selectedObject && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {/* Hint text — hidden on small screens to avoid crowding */}
          <div className="hidden sm:flex rounded-full bg-[#1a1d27]/90 px-4 py-2 text-xs text-[#8b90a7] shadow-lg backdrop-blur-sm select-none whitespace-nowrap">
            Drag · Resize · Rotate · <kbd className="ml-1 font-mono text-[#e8eaf0]">Del</kbd>
          </div>

          {/* Floating delete — always visible, large touch target */}
          <button
            type="button"
            onClick={removeActive}
            title="Delete selected element"
            className="flex items-center gap-1.5 rounded-full bg-[#e05c5c] hover:bg-[#ee6e6e] active:scale-95 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all touch-manipulation select-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14H6L5 6" />
              <path strokeLinecap="round" d="M10 11v6M14 11v6M9 6V4h6v2" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </main>
  )
}
