import { useState } from 'react'
import type { KeyboardEvent } from 'react'

export const GOOGLE_FONTS = [
  'Poppins',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'Oswald',
  'Ubuntu',
  'Nunito',
  'Source Sans 3',
  'PT Sans',
  'Josefin Sans',
  'Bebas Neue',
  'Dancing Script',
  'Pacifico',
  'Lobster',
  'Righteous',
  'Abril Fatface',
  'Cinzel',
  'Permanent Marker',
  'Caveat',
  'Satisfy',
]

interface TextControlsProps {
  onAdd: (text: string, color: string, size: number, fontFamily: string) => void
}

/**
 * Controls for adding a new text layer to the canvas.
 */
export default function TextControls({ onAdd }: TextControlsProps) {
  const [text, setText] = useState('Your text here')
  const [color, setColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState<string>('48')
  const [fontFamily, setFontFamily] = useState('Poppins')
  const [sizeError, setSizeError] = useState('')

  const handleAdd = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const size = Number(fontSize)
    if (!fontSize || size <= 0) {
      setSizeError('Size must be greater than 0')
      return
    }
    setSizeError('')
    onAdd(trimmed, color, size, fontFamily)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Text input */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Enter text…"
        className="w-full rounded-md bg-[#0f1117] border border-[#2e3347] px-3 py-2 text-sm text-[#e8eaf0] placeholder-[#8b90a7] focus:outline-none focus:border-[#6c63ff] transition-colors min-h-[44px]"
      />

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

      <div className="flex gap-2">
        {/* Colour picker */}
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

        {/* Font size */}
        <div className="flex flex-col gap-1 w-20">
          <label className="text-xs text-[#8b90a7]">Size</label>
          <input
            type="number"
            value={fontSize}
            onChange={(e) => { setFontSize(e.target.value); setSizeError('') }}
            min={0}
            max={400}
            className={`w-full rounded-md bg-[#0f1117] border px-2 py-1.5 text-sm text-[#e8eaf0] focus:outline-none transition-colors min-h-[44px] ${sizeError ? 'border-[#e05c5c]' : 'border-[#2e3347] focus:border-[#6c63ff]'}`}
          />
          {sizeError && <span className="text-[10px] text-[#e05c5c] leading-tight">{sizeError}</span>}
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="w-full rounded-md bg-[#6c63ff] hover:bg-[#5a52e0] active:bg-[#4e47c7] px-4 py-3 text-sm font-medium text-white transition-colors touch-manipulation min-h-[44px]"
      >
        Add Text
      </button>
    </div>
  )
}
