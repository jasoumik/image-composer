import { useState, useEffect } from 'react'
import { fabric } from 'fabric'
import { GOOGLE_FONTS } from './TextControls'

interface SelectionControlsProps {
  selectedObject: fabric.Object | null
  onApply: (
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
  onRemove: () => void
  onApplyObjectProps: (props: { opacity?: number; flipX?: boolean; flipY?: boolean }) => void
  onFlipH: () => void
  onFlipV: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onDuplicate: () => void
  onApplyImageFilters: (brightness: number, contrast: number, saturation: number) => void
  onSaveFilterSnapshot: () => void
}

type AccordionSection = 'transform' | 'textStyle' | 'filters' | 'appearance'

function AccordionItem({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: AccordionSection
  title: string
  open: boolean
  onToggle: (id: AccordionSection) => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between px-3 py-2.5 bg-[#242736] hover:bg-[#2a2e42] transition-colors rounded-lg"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8b90a7]">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 text-[#8b90a7] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-1 pt-3 pb-2 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Shows editing controls for the currently selected canvas object.
 * Grouped into collapsible accordion sections.
 */
export default function SelectionControls({
  selectedObject,
  onApply,
  onRemove,
  onApplyObjectProps,
  onFlipH,
  onFlipV,
  onBringForward,
  onSendBackward,
  onDuplicate,
  onApplyImageFilters,
  onSaveFilterSnapshot,
}: SelectionControlsProps) {
  const isText = selectedObject instanceof fabric.IText
  const isImage = selectedObject instanceof fabric.Image

  // ── Text state ────────────────────────────────────────────────────────────
  const [color, setColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState<string>('48')
  const [fontFamily, setFontFamily] = useState('Poppins')
  const [sizeError, setSizeError] = useState('')
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal')
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')
  const [charSpacing, setCharSpacing] = useState<string>('0')
  const [stroke, setStroke] = useState<string>('#000000')
  const [strokeWidth, setStrokeWidth] = useState<string>('0')
  const [strokeEnabled, setStrokeEnabled] = useState(false)

  // ── Shared state ──────────────────────────────────────────────────────────
  const [opacity, setOpacity] = useState<number>(100)

  // ── Filter state ──────────────────────────────────────────────────────────
  const [brightness, setBrightness] = useState<number>(0)
  const [contrast, setContrast] = useState<number>(0)
  const [saturation, setSaturation] = useState<number>(0)

  // ── Accordion state ───────────────────────────────────────────────────────
  const [openSections, setOpenSections] = useState<Set<AccordionSection>>(
    new Set(['transform', 'textStyle'])
  )

  const toggleSection = (id: AccordionSection) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Sync state from selected object ──────────────────────────────────────
  useEffect(() => {
    if (!selectedObject) return
    setOpacity(Math.round((selectedObject.opacity ?? 1) * 100))

    if (isText) {
      const itext = selectedObject as fabric.IText
      setColor((itext.fill as string | undefined) ?? '#ffffff')
      setFontSize(String(itext.fontSize ?? 48))
      setFontFamily(itext.fontFamily ?? 'Poppins')
      setSizeError('')
      setFontWeight((itext.fontWeight as 'normal' | 'bold') ?? 'normal')
      setFontStyle((itext.fontStyle as 'normal' | 'italic') ?? 'normal')
      setTextAlign((itext.textAlign as 'left' | 'center' | 'right') ?? 'left')
      setCharSpacing(String(itext.charSpacing ?? 0))
      const hasStroke = !!itext.stroke && itext.stroke !== '' && (itext.strokeWidth ?? 0) > 0
      setStrokeEnabled(hasStroke)
      setStroke(itext.stroke as string || '#000000')
      setStrokeWidth(String(itext.strokeWidth ?? 0))
    }

    if (isImage) {
      // Reset filter UI when switching to a new image
      setBrightness(0)
      setContrast(0)
      setSaturation(0)
    }
  }, [selectedObject, isText, isImage])

  if (!selectedObject) return null

  const handleApply = () => {
    const size = Number(fontSize)
    if (!fontSize || size <= 0) {
      setSizeError('Size must be greater than 0')
      return
    }
    setSizeError('')
    onApply(color, size, fontFamily, {
      opacity: opacity / 100,
      fontWeight,
      fontStyle,
      textAlign,
      charSpacing: Number(charSpacing),
      stroke: strokeEnabled ? stroke : '',
      strokeWidth: strokeEnabled ? Number(strokeWidth) : 0,
    })
  }

  const handleOpacityChange = (val: number) => {
    setOpacity(val)
    onApplyObjectProps({ opacity: val / 100 })
  }

  const handleFilterChange = (b: number, c: number, s: number) => {
    setBrightness(b)
    setContrast(c)
    setSaturation(s)
    onApplyImageFilters(b, c, s)
  }

  const resetFilters = () => {
    setBrightness(0)
    setContrast(0)
    setSaturation(0)
    onApplyImageFilters(0, 0, 0)
    onSaveFilterSnapshot()
  }

  return (
    <div className="flex flex-col gap-2">
      {/* ── Transform section ─────────────────────────────────────── */}
      <AccordionItem
        id="transform"
        title="Transform"
        open={openSections.has('transform')}
        onToggle={toggleSection}
      >
        {/* Opacity */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-[#8b90a7]">Opacity</label>
            <span className="text-xs text-[#e8eaf0] font-mono w-10 text-right">{opacity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            className="w-full accent-[#6c63ff] cursor-pointer"
          />
        </div>

        {/* Layer order */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBringForward}
            className="flex-1 rounded-md bg-[#0f1117] border border-[#2e3347] hover:border-[#6c63ff]/60 px-2 py-2 text-xs text-[#e8eaf0] transition-colors touch-manipulation min-h-[40px]"
          >
            Bring Forward
          </button>
          <button
            type="button"
            onClick={onSendBackward}
            className="flex-1 rounded-md bg-[#0f1117] border border-[#2e3347] hover:border-[#6c63ff]/60 px-2 py-2 text-xs text-[#e8eaf0] transition-colors touch-manipulation min-h-[40px]"
          >
            Send Back
          </button>
        </div>

        {/* Flip (images only) */}
        {isImage && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onFlipH}
              className="flex-1 rounded-md bg-[#0f1117] border border-[#2e3347] hover:border-[#6c63ff]/60 px-2 py-2 text-xs text-[#e8eaf0] transition-colors touch-manipulation min-h-[40px]"
            >
              Flip H
            </button>
            <button
              type="button"
              onClick={onFlipV}
              className="flex-1 rounded-md bg-[#0f1117] border border-[#2e3347] hover:border-[#6c63ff]/60 px-2 py-2 text-xs text-[#e8eaf0] transition-colors touch-manipulation min-h-[40px]"
            >
              Flip V
            </button>
          </div>
        )}

        {/* Duplicate */}
        <button
          type="button"
          onClick={onDuplicate}
          className="w-full rounded-md bg-[#0f1117] border border-[#2e3347] hover:border-[#6c63ff]/60 px-3 py-2 text-xs text-[#e8eaf0] transition-colors touch-manipulation min-h-[40px]"
        >
          Duplicate
        </button>
      </AccordionItem>

      {/* ── Text Style section (only for text objects) ────────────── */}
      {isText && (
        <AccordionItem
          id="textStyle"
          title="Text Style"
          open={openSections.has('textStyle')}
          onToggle={toggleSection}
        >
          {/* Font family */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8b90a7]">Font</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full rounded-md bg-[#0f1117] border border-[#2e3347] px-3 py-2 text-sm text-[#e8eaf0] focus:outline-none focus:border-[#6c63ff] transition-colors min-h-[44px] cursor-pointer"
              style={{ fontFamily }}
            >
              {GOOGLE_FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Color + size */}
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-[#8b90a7]">Colour</label>
              <div className="flex items-center gap-2 rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1.5 min-h-[44px]">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 touch-manipulation"
                  aria-label="Text colour"
                />
                <span className="text-xs text-[#8b90a7] font-mono">{color}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 w-20">
              <label className="text-xs text-[#8b90a7]">Size</label>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => { setFontSize(e.target.value); setSizeError('') }}
                min={1}
                max={400}
                className={`w-full rounded-md bg-[#0f1117] border px-2 py-1.5 text-sm text-[#e8eaf0] focus:outline-none transition-colors min-h-[44px] ${sizeError ? 'border-[#e05c5c]' : 'border-[#2e3347] focus:border-[#6c63ff]'}`}
              />
              {sizeError && <span className="text-[10px] text-[#e05c5c] leading-tight">{sizeError}</span>}
            </div>
          </div>

          {/* Bold / Italic */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
              className={`flex-1 rounded-md border px-2 py-2 text-sm font-bold transition-colors touch-manipulation min-h-[40px] ${
                fontWeight === 'bold'
                  ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
                  : 'bg-[#0f1117] border-[#2e3347] text-[#e8eaf0] hover:border-[#6c63ff]/60'
              }`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
              className={`flex-1 rounded-md border px-2 py-2 text-sm italic transition-colors touch-manipulation min-h-[40px] ${
                fontStyle === 'italic'
                  ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
                  : 'bg-[#0f1117] border-[#2e3347] text-[#e8eaf0] hover:border-[#6c63ff]/60'
              }`}
            >
              I
            </button>
          </div>

          {/* Text alignment */}
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                type="button"
                onClick={() => setTextAlign(align)}
                className={`flex-1 rounded-md border px-2 py-2 text-xs transition-colors touch-manipulation min-h-[40px] ${
                  textAlign === align
                    ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
                    : 'bg-[#0f1117] border-[#2e3347] text-[#e8eaf0] hover:border-[#6c63ff]/60'
                }`}
              >
                {align === 'left' ? '⬅' : align === 'center' ? '☰' : '➡'}
              </button>
            ))}
          </div>

          {/* Letter spacing */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8b90a7]">Letter Spacing</label>
            <input
              type="number"
              value={charSpacing}
              onChange={(e) => setCharSpacing(e.target.value)}
              min={-200}
              max={800}
              className="w-full rounded-md bg-[#0f1117] border border-[#2e3347] px-3 py-2 text-sm text-[#e8eaf0] focus:outline-none focus:border-[#6c63ff] transition-colors min-h-[44px]"
            />
          </div>

          {/* Apply button */}
          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-md bg-[#6c63ff] hover:bg-[#5a52e0] active:bg-[#4e47c7] px-4 py-3 text-sm font-medium text-white transition-colors touch-manipulation min-h-[44px]"
          >
            Apply Changes
          </button>
        </AccordionItem>
      )}

      {/* ── Filters section (images only) ────────────────────────── */}
      {isImage && (
        <AccordionItem
          id="filters"
          title="Filters"
          open={openSections.has('filters')}
          onToggle={toggleSection}
        >
          {/* Brightness */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#8b90a7]">Brightness</label>
              <span className="text-xs text-[#e8eaf0] font-mono w-12 text-right">{brightness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={brightness}
              onChange={(e) => handleFilterChange(Number(e.target.value), contrast, saturation)}
              onMouseUp={onSaveFilterSnapshot}
              onTouchEnd={onSaveFilterSnapshot}
              className="w-full accent-[#6c63ff] cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#8b90a7]">Contrast</label>
              <span className="text-xs text-[#e8eaf0] font-mono w-12 text-right">{contrast.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={contrast}
              onChange={(e) => handleFilterChange(brightness, Number(e.target.value), saturation)}
              onMouseUp={onSaveFilterSnapshot}
              onTouchEnd={onSaveFilterSnapshot}
              className="w-full accent-[#6c63ff] cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#8b90a7]">Saturation</label>
              <span className="text-xs text-[#e8eaf0] font-mono w-12 text-right">{saturation.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={saturation}
              onChange={(e) => handleFilterChange(brightness, contrast, Number(e.target.value))}
              onMouseUp={onSaveFilterSnapshot}
              onTouchEnd={onSaveFilterSnapshot}
              className="w-full accent-[#6c63ff] cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-md bg-[#0f1117] border border-[#2e3347] hover:border-[#6c63ff]/60 px-3 py-2 text-xs text-[#8b90a7] transition-colors touch-manipulation min-h-[40px]"
          >
            Reset Filters
          </button>
        </AccordionItem>
      )}

      {/* ── Appearance section (stroke for text only) ─────────────── */}
      {isText && (
        <AccordionItem
          id="appearance"
          title="Appearance"
          open={openSections.has('appearance')}
          onToggle={toggleSection}
        >
          {/* Stroke toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-[#8b90a7]">Stroke / Outline</label>
            <button
              type="button"
              onClick={() => setStrokeEnabled(!strokeEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                strokeEnabled ? 'bg-[#6c63ff]' : 'bg-[#2e3347]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  strokeEnabled ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {strokeEnabled && (
            <>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-[#8b90a7]">Stroke Colour</label>
                  <div className="flex items-center gap-2 rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1.5 min-h-[44px]">
                    <input
                      type="color"
                      value={stroke}
                      onChange={(e) => setStroke(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 touch-manipulation"
                      aria-label="Stroke colour"
                    />
                    <span className="text-xs text-[#8b90a7] font-mono">{stroke}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 w-20">
                  <label className="text-xs text-[#8b90a7]">Width</label>
                  <input
                    type="number"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(e.target.value)}
                    min={0}
                    max={20}
                    className="w-full rounded-md bg-[#0f1117] border border-[#2e3347] px-2 py-1.5 text-sm text-[#e8eaf0] focus:outline-none focus:border-[#6c63ff] transition-colors min-h-[44px]"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-md bg-[#6c63ff] hover:bg-[#5a52e0] active:bg-[#4e47c7] px-4 py-3 text-sm font-medium text-white transition-colors touch-manipulation min-h-[44px]"
          >
            Apply Changes
          </button>
        </AccordionItem>
      )}

      {/* ── Remove button — always visible outside accordions ─────── */}
      <button
        type="button"
        onClick={onRemove}
        className="w-full rounded-md border border-[#e05c5c]/40 bg-[#e05c5c]/10 hover:bg-[#e05c5c]/20 px-4 py-3 text-sm font-medium text-[#e05c5c] transition-colors touch-manipulation min-h-[44px]"
      >
        Remove Element
      </button>
    </div>
  )
}
