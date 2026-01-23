"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { File } from "@/lib/types"
import { FileText, Users, Loader2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { FileActionsMenu } from "./file-actions-menu"
import { pdfjs } from "react-pdf"

// PDF.js worker configuration - using unpkg CDN
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

interface FileCardProps {
  file: File
  memberCount?: number
  currentPage?: number
  onUpdate?: () => void
}

export function FileCard({ file, memberCount = 0, currentPage, onUpdate }: FileCardProps) {
  const progress = currentPage && file.total_pages ? Math.round((currentPage / file.total_pages) * 100) : 0
  const [coverUrl, setCoverUrl] = useState<string | null>(file.cover_image_url || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = createClient()

  const generateCover = useCallback(async () => {
    if (coverUrl || isGenerating || !file.file_url) return

    setIsGenerating(true)
    try {
      const loadingTask = pdfjs.getDocument(file.file_url)
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)

      const scale = 0.5
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

      const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
      setCoverUrl(dataUrl)

      supabase.from("files").update({ cover_image_url: dataUrl }).eq("id", file.id).then(() => {})
    } catch (error) {
      console.error("[v0] Failed to generate cover:", error)
    } finally {
      setIsGenerating(false)
    }
  }, [coverUrl, isGenerating, file.file_url, file.id, supabase])

  useEffect(() => {
    if (!coverUrl && file.file_url && file.file_type === "application/pdf") {
      generateCover()
    }
  }, [coverUrl, file.file_url, file.file_type, generateCover])

  return (
    <Link href={`/read/${file.id}`} className="group block">
      <canvas ref={canvasRef} className="hidden" />

      {/* Cover Image - poster style with rounded corners */}
      <div className="aspect-[3/4] relative rounded-xl overflow-hidden bg-muted">
        {/* Actions menu in top right */}
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <FileActionsMenu fileId={file.id} fileName={file.title} onUpdate={() => onUpdate?.()} />
        </div>

        {coverUrl ? (
          <img
            src={coverUrl || "/placeholder.svg"}
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

        {/* Progress bar at bottom of image */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Member count badge */}
        {memberCount > 1 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
            <Users className="w-3 h-3" />
            {memberCount}
          </div>
        )}
      </div>

      {/* Title below image */}
      <div className="mt-2 px-1">
        <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 text-center">
          {file.title}
        </h3>
        {file.total_pages > 0 && currentPage && (
          <p className="text-xs text-muted-foreground mt-0.5 text-center">
            Page {currentPage} of {file.total_pages}
          </p>
        )}
      </div>
    </Link>
  )
}
