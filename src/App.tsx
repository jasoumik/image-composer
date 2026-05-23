import { useRef, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import CanvasArea from './components/CanvasArea'
import { useCanvas } from './hooks/useCanvas'

/**
 * Root shell: two-column layout — fixed sidebar on the left, canvas area fills the rest.
 */
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const {
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
  } = useCanvas(canvasRef)

  // ── Global keyboard shortcuts: Undo / Redo ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      // Don't fire while typing in an input
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // ── Feature 1: Arrow key nudge ─────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      nudgeActive(dx, dy)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nudgeActive])

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#0f1117] text-[#e8eaf0]">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <Sidebar
        hasBackground={hasBackground}
        selectedObject={selectedObject}
        loadBackground={loadBackground}
        loadLogo={loadLogo}
        addText={addText}
        removeActive={removeActive}
        clearCanvas={clearCanvas}
        downloadImage={downloadImage}
        applyTextProps={applyTextProps}
        applyObjectProps={applyObjectProps}
        flipHorizontal={flipHorizontal}
        flipVertical={flipVertical}
        bringForward={bringForward}
        sendBackward={sendBackward}
        duplicateActive={duplicateActive}
        applyImageFilters={applyImageFilters}
        saveImageFilterSnapshot={saveImageFilterSnapshot}
        resizeCanvas={resizeCanvas}
        canUndo={canUndo}
        canRedo={canRedo}
        undo={undo}
        redo={redo}
        isCropping={isCropping}
        startCrop={startCrop}
        applyCrop={applyCrop}
        cancelCrop={cancelCrop}
        toggleLock={toggleLock}
        showGrid={showGrid}
        toggleGrid={toggleGrid}
        setCanvasBgSolid={setCanvasBgSolid}
        setCanvasBgGradient={setCanvasBgGradient}
        addShape={addShape}
      />

      {/* ── Main canvas area ────────────────────────────────────── */}
      <CanvasArea
        canvasRef={canvasRef}
        hasBackground={hasBackground}
        selectedObject={selectedObject}
        removeActive={removeActive}
        canvas={canvas}
        showGrid={showGrid}
      />
    </div>
  )
}
