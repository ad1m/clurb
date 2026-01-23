"use client"

import { useEffect, useRef, useState } from "react"
import { pdfjs } from "react-pdf"

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFCoverGeneratorProps {
  fileUrl: string
  onCoverGenerated: (coverDataUrl: string) => void
}

export function PDFCoverGenerator({ fileUrl, onCoverGenerated }: PDFCoverGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!fileUrl || isGenerating) return

    const generateCover = async () => {
      setIsGenerating(true)
      try {
        const loadingTask = pdfjs.getDocument(fileUrl)
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        
        const scale = 1.5
        const viewport = page.getViewport({ scale })
        
        const canvas = canvasRef.current
        if (!canvas) return
        
        const context = canvas.getContext("2d")
        if (!context) return
        
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
        onCoverGenerated(dataUrl)
      } catch (error) {
        console.error("[v0] Failed to generate cover:", error)
      } finally {
        setIsGenerating(false)
      }
    }

    generateCover()
  }, [fileUrl, onCoverGenerated, isGenerating])

  return <canvas ref={canvasRef} className="hidden" />
}
