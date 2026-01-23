"use client"

import type React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// PDF.js worker configuration
// Using cdnjs CDN which is more reliable for pdfjs-dist
if (typeof window !== "undefined") {
  // pdfjs 5.x uses .mjs extension for ES modules
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
}

interface PDFViewerProps {
  fileUrl: string
  currentPage: number
  onPageChange: (page: number) => void
  onTotalPagesChange: (total: number) => void
  onTextSelect?: (text: string, page: number) => void
  children?: React.ReactNode
}

export function PDFViewer({
  fileUrl,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  onTextSelect,
  children,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [scale, setScale] = useState(1.0)
  const [isLoading, setIsLoading] = useState(true)
  const [pageInput, setPageInput] = useState(currentPage.toString())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [renderKey, setRenderKey] = useState(0)
  const renderTaskRef = useRef<any>(null)

  useEffect(() => {
    setPageInput(currentPage.toString())
  }, [currentPage])

  useEffect(() => {
    console.log("[v0] PDF Viewer - fileUrl:", fileUrl)
    // Reset state when fileUrl changes
    setNumPages(null)
    setIsLoading(true)
    setLoadError(null)
    setRenderKey(prev => prev + 1)
  }, [fileUrl])

  // Cleanup render tasks on unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [])

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      console.log("[v0] PDF loaded successfully, pages:", numPages)
      setNumPages(numPages)
      setIsLoading(false)
      onTotalPagesChange(numPages)
    },
    [onTotalPagesChange],
  )

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("[v0] PDF load error:", error.message)
    setLoadError(error.message)
    setIsLoading(false)
  }, [])

  const onPageRenderSuccess = useCallback(() => {
    console.log("[v0] PDF page rendered successfully")
    renderTaskRef.current = null
  }, [])

  const onPageRenderError = useCallback((error: Error) => {
    console.error("[v0] PDF page render error:", error.message)
    renderTaskRef.current = null
  }, [])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
      onPageChange(page)
    }
  }

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value)
  }

  const handlePageInputBlur = () => {
    const page = Number.parseInt(pageInput, 10)
    if (!isNaN(page)) {
      goToPage(page)
    } else {
      setPageInput(currentPage.toString())
    }
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePageInputBlur()
    }
  }

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim() && onTextSelect) {
      onTextSelect(selection.toString().trim(), currentPage)
    }
  }, [currentPage, onTextSelect])

  return (
    <div className="flex flex-col h-full">
      {/* PDF Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1 text-sm">
            <Input
              value={pageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputBlur}
              onKeyDown={handlePageInputKeyDown}
              className="w-14 h-8 text-center"
            />
            <span className="text-muted-foreground">of {numPages || "..."}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= (numPages || 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-14 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.min(2, s + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto bg-muted/30 relative" onMouseUp={handleTextSelection}>
        <div className="flex justify-center py-8 min-h-full">
          <Document
            key={`${fileUrl}-${renderKey}`}
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-96 text-center p-4">
                <p className="text-destructive font-medium">Failed to load PDF</p>
                <p className="text-sm text-muted-foreground mt-1">{loadError || "Please check the file and try again"}</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-md break-all">URL: {fileUrl}</p>
              </div>
            }
          >
            <div className="relative shadow-xl">
              <Page
                key={`page-${currentPage}-${scale}`}
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="bg-white"
                onRenderSuccess={onPageRenderSuccess}
                onRenderError={onPageRenderError}
                loading={
                  <div className="flex items-center justify-center h-96 w-[612px] bg-white">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                }
              />
              {/* Sticky notes overlay */}
              {children}
            </div>
          </Document>
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
