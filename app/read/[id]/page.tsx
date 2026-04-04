"use client"

import { useEffect, useState, useCallback, useRef, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { ClurbFile, StickyNote, User } from "@/lib/types"
import dynamic from "next/dynamic"
const PDFViewer = dynamic(() => import("@/components/pdf-viewer").then((m) => m.PDFViewer), { ssr: false })
import { Sticker } from "@/components/sticker"
import { StickerCreator, QuickStickerCreator } from "@/components/sticker-creator"
import { AIAssistantSidebar } from "@/components/ai-assistant-sidebar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, ArrowLeft, Loader2, Sparkles, Pencil } from "lucide-react"
import type { Mark } from "@/components/annotation-canvas"
const AnnotationCanvas = dynamic(() => import("@/components/annotation-canvas").then((m) => m.AnnotationCanvas), { ssr: false })
import { AnnotationToolbar } from "@/components/annotation-toolbar"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ReadPage({ params }: PageProps) {
  const { id: fileId } = use(params)
  const [file, setFile] = useState<ClurbFile | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [quickStickerData, setQuickStickerData] = useState<{ title: string; content: string } | null>(null)
  const [showAnnotationToolbar, setShowAnnotationToolbar] = useState(false)
  const [activeTool, setActiveTool] = useState<"highlight" | "pen" | "eraser" | null>(null)
  const [activeColor, setActiveColor] = useState("#FBBF24")
  const [pageMarks, setPageMarks] = useState<Mark[]>([])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  // contentAreaRef is attached to the full page+margin container inside PDFViewer.
  // It serves as the coordinate space for both the annotation canvas and stickers.
  const contentAreaRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const fetchStickyNotes = useCallback(async (page: number) => {
    const res = await fetch(`/api/sticky-notes?fileId=${fileId}`)
    if (res.ok) {
      const { stickyNotes: notes } = await res.json()
      setStickyNotes((notes as StickyNote[]).filter((n) => n.pageNumber === page))
    }
  }, [fileId])

  const fetchData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me")
    if (!meRes.ok) { router.push("/auth/login"); return }
    const { user: currentUser } = await meRes.json()
    setUser(currentUser)

    const fileRes = await fetch(`/api/files/${fileId}`)
    if (!fileRes.ok) {
      toast({ title: "File not found", description: "This document doesn't exist or you don't have access.", variant: "destructive" })
      router.push("/library")
      return
    }

    const { file: fileData } = await fileRes.json()
    setFile(fileData)

    // Restore last reading position
    if (fileData.progress?.currentPage) {
      setCurrentPage(fileData.progress.currentPage)
      await fetchStickyNotes(fileData.progress.currentPage)
    } else {
      await fetchStickyNotes(1)
    }

    setIsLoading(false)
  }, [fileId, router, toast, fetchStickyNotes])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reload sticky notes when page changes
  useEffect(() => {
    if (user) fetchStickyNotes(currentPage)
  }, [currentPage, user, fetchStickyNotes])

  // Load annotations when page changes
  useEffect(() => {
    if (!user || !fileId) return
    let cancelled = false
    fetch(`/api/annotations?fileId=${fileId}&pageNumber=${currentPage}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (!cancelled) setPageMarks(data?.marks ?? [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [currentPage, user, fileId])

  // Debounced reading progress update
  useEffect(() => {
    if (!user || !fileId) return
    const timer = setTimeout(async () => {
      await fetch("/api/reading-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, currentPage }),
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [currentPage, user, fileId])

  const handleCreateSticker = async (title: string, content: string, metadata: string, x: number, y: number) => {
    if (!user) return
    setIsCreatingNote(true)
    try {
      const res = await fetch("/api/sticky-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          pageNumber: currentPage,
          content: title ? `${title}\n\n${content}` : content,
          color: metadata,
          positionX: x,
          positionY: y,
        }),
      })
      if (!res.ok) throw new Error("Failed to create sticker")
      const { stickyNote } = await res.json()
      setStickyNotes((prev) => [...prev, stickyNote])
      toast({ title: "Sticker added", description: "Your sticker has been pinned to this page!" })
    } catch {
      toast({ title: "Failed to create sticker", variant: "destructive" })
    } finally {
      setIsCreatingNote(false)
      setQuickStickerData(null)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/sticky-notes/${noteId}`, { method: "DELETE" })
      setStickyNotes((prev) => prev.filter((n) => n.id !== noteId))
      toast({ title: "Sticker deleted" })
    } catch {
      toast({ title: "Failed to delete sticker", variant: "destructive" })
    }
  }

  const handleUpdateNoteColor = (noteId: string, color: string) => {
    fetch(`/api/sticky-notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    }).catch(() => {})
    setStickyNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, color } : n))
  }

  const handleUpdateNotePosition = async (noteId: string, x: number, y: number) => {
    fetch(`/api/sticky-notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionX: x, positionY: y }),
    }).catch(() => {})
    setStickyNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, positionX: x, positionY: y } : n))
  }

  const handleTotalPagesChange = async (total: number) => {
    if (file && file.totalPages !== total) {
      await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalPages: total }),
      })
      setFile((prev) => (prev ? { ...prev, totalPages: total } : null))
    }
  }

  const handleTextSelect = (text: string) => {
    if (text.length > 10) {
      setSelectedText(text)
      setShowAIAssistant(true)
    }
  }

  const handleMarksChange = useCallback((marks: Mark[]) => {
    setPageMarks(marks)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      fetch("/api/annotations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, pageNumber: currentPage, data: { marks } }),
      }).catch(() => {})
    }, 800)
  }, [fileId, currentPage])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!file) return null

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/library">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm truncate max-w-[200px]">{file.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StickerCreator onCreateSticker={handleCreateSticker} isCreating={isCreatingNote} />

          <Button
            variant={showAnnotationToolbar ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => {
              setShowAnnotationToolbar((v) => !v)
              if (showAnnotationToolbar) setActiveTool(null)
            }}
          >
            <Pencil className="w-4 h-4" />
            Markup
          </Button>

          <Button
            variant={showAIAssistant ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => setShowAIAssistant(!showAIAssistant)}
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0" ref={pageContainerRef}>
          <PDFViewer
            fileUrl={file.fileUrl}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onTotalPagesChange={handleTotalPagesChange}
            onTextSelect={handleTextSelect}
            isMarkupActive={activeTool !== null}
            outerRef={contentAreaRef}
          >
            {/* Annotation canvas — absolute inset-0 spans full content area incl. margins */}
            <AnnotationCanvas
              marks={pageMarks}
              activeTool={activeTool}
              activeColor={activeColor}
              onMarksChange={handleMarksChange}
            />

            {/* Sticker overlay — pointer-events-none so events pass through to canvas/text.
                Individual <Sticker> elements still receive events (CSS spec: pointer-events:none
                on a parent does not block children from being event targets). */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
              {stickyNotes.map((note) => (
                <Sticker
                  key={note.id}
                  note={note}
                  isOwn={note.authorId === user?.id}
                  onDelete={() => handleDeleteNote(note.id)}
                  onUpdate={(id, color) => handleUpdateNoteColor(id, color)}
                  onDragEnd={(x, y) => handleUpdateNotePosition(note.id, x, y)}
                  containerRef={contentAreaRef}
                />
              ))}
            </div>
          </PDFViewer>
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      <AIAssistantSidebar
        isOpen={showAIAssistant}
        onClose={() => { setShowAIAssistant(false); setSelectedText(null) }}
        selectedText={selectedText}
        fileId={fileId}
        pageNumber={currentPage}
        onCreateStickyNote={(title, content) => setQuickStickerData({ title, content })}
      />

      {/* Annotation toolbar — floats at bottom center */}
      {showAnnotationToolbar && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <AnnotationToolbar
            activeTool={activeTool}
            activeColor={activeColor}
            onToolChange={setActiveTool}
            onColorChange={setActiveColor}
            onClearAll={() => handleMarksChange([])}
            onClose={() => { setShowAnnotationToolbar(false); setActiveTool(null) }}
          />
        </div>
      )}

      {quickStickerData && (
        <QuickStickerCreator
          title={quickStickerData.title}
          content={quickStickerData.content}
          onCreateSticker={handleCreateSticker}
          isCreating={isCreatingNote}
          onClose={() => setQuickStickerData(null)}
        />
      )}
    </div>
  )
}
