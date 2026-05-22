import { useRef, useState } from 'react'
import type { DragEvent, ChangeEvent } from 'react'

interface UploadZoneProps {
  accept: string
  label: string
  sublabel?: string
  onFile: (file: File) => void
  loaded: boolean
}

/**
 * Drag-and-drop / click-to-upload zone.
 * Shows filename and a green badge when a file has been loaded.
 */
export default function UploadZone({ accept, label, sublabel, onFile, loaded }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = (file: File | undefined) => {
    if (file) {
      onFile(file)
      setFileName(file.name)
    }
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0])
    // Reset so the same file can be re-uploaded
    e.target.value = ''
  }

  // Truncate long filenames
  const truncatedName = fileName && fileName.length > 28
    ? fileName.slice(0, 12) + '…' + fileName.slice(-12)
    : fileName

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-all select-none min-h-[88px]',
          isDragging
            ? 'border-[#6c63ff] bg-[#6c63ff]/10 scale-[1.02]'
            : loaded
              ? 'border-[#43c97e]/50 bg-[#43c97e]/5 hover:border-[#43c97e]/70'
              : 'border-[#2e3347] bg-[#0f1117] hover:border-[#6c63ff]/60 hover:bg-[#6c63ff]/5',
        ].join(' ')}
      >
        {/* Icon */}
        {loaded ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#43c97e]/15">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#43c97e]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2e3347]/60">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-[#8b90a7]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
        )}

        {/* Label / filename */}
        {loaded && truncatedName ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-medium text-[#43c97e]">Loaded</span>
            <span className="text-[10px] text-[#8b90a7] font-mono leading-tight text-center">{truncatedName}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm text-[#8b90a7] text-center leading-snug">{label}</span>
            {sublabel && (
              <span className="text-[10px] text-[#8b90a7]/60 text-center">{sublabel}</span>
            )}
          </div>
        )}

        {/* Re-upload hint when loaded */}
        {loaded && (
          <span className="text-[10px] text-[#8b90a7]/50">Click to replace</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}
