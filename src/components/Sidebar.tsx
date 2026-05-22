import { useState, useEffect, useRef } from 'react'
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
  downloadImage: () => void
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
}

type SectionKey = 'Background' | 'Logo' | 'Text' | 'Edit' | 'Canvas'

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
    case 'Edit': return <EditIcon />
    case 'Canvas': return <CanvasIcon />
  }
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
}: SidebarProps) {
  // ── Desktop: which sections are open ─────────────────────────────────────
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(['Background', 'Logo', 'Text', 'Canvas'])
  )
  const [customW, setCustomW] = useState<string>('1080')
  const [customH, setCustomH] = useState<string>('1080')

  // ── Mobile: which drawer is open ─────────────────────────────────────────
  const [activeDrawer, setActiveDrawer] = useState<SectionKey | null>(null)
  const editSectionRef = useRef<HTMLDivElement>(null)

  // Keep the last non-null selected object so the Edit section content stays
  // rendered (and the same height) even after Fabric clears selection when the
  // user clicks a sidebar input. This prevents the height change that causes
  // the sidebar to scroll to the top.
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
    />
  ) : (
    <p className="text-xs text-[#8b90a7]">Select an element on the canvas to edit it.</p>
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
        {/* type="text" + inputMode avoids browser-native scroll-to-input
            behaviour that type="number" triggers in scrollable containers */}
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
    </div>
  )

  function getSectionContent(key: SectionKey) {
    switch (key) {
      case 'Background': return backgroundContent
      case 'Logo': return logoContent
      case 'Text': return textContent
      case 'Edit': return editContent
      case 'Canvas': return canvasContent
    }
  }

  function sectionLabel(key: SectionKey): string {
    switch (key) {
      case 'Background': return 'Background Image'
      case 'Logo': return 'Logo Overlay'
      case 'Text': return 'Add Text'
      case 'Edit': return 'Edit Selected'
      case 'Canvas': return 'Canvas Size'
    }
  }

  // ── Desktop collapsible section ───────────────────────────────────────────
  function DesktopSection({ sectionKey }: { sectionKey: SectionKey }) {
    const open = openSections.has(sectionKey)
    const ref = sectionKey === 'Edit' ? editSectionRef : undefined
    return (
      <div ref={ref} className="flex flex-col gap-0">
        <button
          type="button"
          onClick={() => toggleDesktopSection(sectionKey)}
          className="flex w-full items-center justify-between py-2.5 group"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8b90a7] group-hover:text-[#b0b4c8] transition-colors">
            {sectionLabel(sectionKey)}
          </span>
          <Chevron open={open} />
        </button>
        {open && (
          <div className="pb-4">
            {getSectionContent(sectionKey)}
          </div>
        )}
      </div>
    )
  }

  // ── Visible toolbar sections on mobile ────────────────────────────────────
  const mobileToolbarSections: SectionKey[] = ['Background', 'Logo', 'Text', 'Edit', 'Canvas']

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
          <DesktopSection sectionKey="Background" />
          <DesktopSection sectionKey="Logo" />
          <DesktopSection sectionKey="Text" />
          {/* Always in DOM — conditional unmount causes sidebar height change → scroll jump */}
          <DesktopSection sectionKey="Edit" />
          <DesktopSection sectionKey="Canvas" />
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

          <button
            type="button"
            onClick={downloadImage}
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
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-[#1a1d27] border-t border-[#2e3347]" style={{ height: '64px' }}>

          {/* Section tabs */}
          <div className="flex flex-1 items-stretch">
            {mobileToolbarSections.map((key) => {
              // Hide Edit tab when nothing is selected
              if (key === 'Edit' && !selectedObject) return null
              const isActive = activeDrawer === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openDrawer(key)}
                  className={[
                    'relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 px-1 transition-colors touch-manipulation',
                    isActive ? 'text-[#6c63ff]' : 'text-[#8b90a7] hover:text-[#b0b4c8]',
                  ].join(' ')}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-[#6c63ff]" />
                  )}
                  {/* Edit badge when selected */}
                  {key === 'Edit' && selectedObject && (
                    <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#6c63ff]" />
                  )}
                  {sectionIcon(key)}
                  <span className="text-[9px] font-medium leading-none truncate w-full text-center">
                    {key === 'Background' ? 'Bg' : key}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="w-px bg-[#2e3347] my-3" />

          {/* Utility actions */}
          <div className="flex items-stretch gap-0">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo"
              className="flex flex-col items-center justify-center gap-0.5 px-3 text-[#8b90a7] hover:text-[#e8eaf0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation min-w-[44px]"
            >
              <UndoIcon />
              <span className="text-[9px] font-medium leading-none">Undo</span>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo"
              className="flex flex-col items-center justify-center gap-0.5 px-3 text-[#8b90a7] hover:text-[#e8eaf0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation min-w-[44px]"
            >
              <RedoIcon />
              <span className="text-[9px] font-medium leading-none">Redo</span>
            </button>
            <button
              type="button"
              onClick={downloadImage}
              disabled={!hasBackground}
              title="Download"
              className="flex flex-col items-center justify-center gap-0.5 px-3 text-[#43c97e] hover:text-[#5cd68e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation min-w-[44px]"
            >
              <DownloadIcon />
              <span className="text-[9px] font-medium leading-none">Save</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
