"use client"

import { useState, useEffect, useRef } from "react"
import type { ClurbFile } from "@/lib/types"
import { FileText, Loader2 } from "lucide-react"
import Link from "next/link"
import { FileActionsMenu } from "./file-actions-menu"
import { pdfjs } from "react-pdf"

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

interface FileCardProps {
  file: ClurbFile
  currentPage?: number
  onUpdate?: () => void
}

export function FileCard({ file, currentPage, onUpdate }: FileCardProps) {
  const progress =
    currentPage && file.totalPages ? Math.round((currentPage / file.totalPages) * 100) : 0
  const [coverUrl, setCoverUrl] = useState<string | null>(file.coverImageUrl || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (coverUrl || hasStartedRef.current || !file.fileUrl || file.fileType !== "application/pdf") return
    hasStartedRef.current = true
    setIsGenerating(true)

    let cancelled = false
    let pdfTask: ReturnType<typeof pdfjs.getDocument> | null = null

    const run = async () => {
      // Fetch via browser fetch so auth cookies are sent correctly
      const response = await fetch(file.fileUrl, { credentials: "include" })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.arrayBuffer()
      if (cancelled) return
      pdfTask = pdfjs.getDocument({ data })
      const pdf = await pdfTask.promise
      if (cancelled) return
      const page = await pdf.getPage(1)
      if (cancelled) return
      const viewport = page.getViewport({ scale: 0.5 })
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext("2d")
      if (!context) return
      canvas.height = viewport.height
      canvas.width = viewport.width
      await page.render({ canvas, canvasContext: context, viewport }).promise
      if (cancelled) return
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
      setCoverUrl(dataUrl)
      fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImageUrl: dataUrl }),
      }).catch(() => {})
    }

    run()
      .catch((error) => { if (!cancelled) console.error("[file-card] cover gen failed:", error) })
      .finally(() => { setIsGenerating(false) })

    return () => {
      cancelled = true
      hasStartedRef.current = false
      pdfTask?.destroy().catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Link href={`/read/${file.id}`} className="group block">
      <canvas ref={canvasRef} className="hidden" />

      <div className="aspect-[3/4] relative rounded-xl overflow-hidden bg-muted">
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <FileActionsMenu fileId={file.id} fileName={file.title} onUpdate={() => onUpdate?.()} />
        </div>

        {coverUrl ? (
          <img
            src={coverUrl}
            alt={file.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : isGenerating ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Loader2 className="w-8 h-8 text-primary/40 animate-spin" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <FileText className="w-16 h-16 text-primary/40" />
          </div>
        )}

        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="mt-2 px-1">
        <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 text-center">
          {file.title}
        </h3>
        {(file.totalPages ?? 0) > 0 && currentPage && (
          <p className="text-xs text-muted-foreground mt-0.5 text-center">
            Page {currentPage} of {file.totalPages}
          </p>
        )}
      </div>
    </Link>
  )
}
