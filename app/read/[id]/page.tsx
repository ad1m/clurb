"use client"

import { useEffect, useState, useCallback, useRef, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { File, FileMember, Profile, StickyNote as StickyNoteType, ReadingProgress } from "@/lib/types"
import { PDFViewer } from "@/components/pdf-viewer"
import { Sticker } from "@/components/sticker"
import { StickerCreator, QuickStickerCreator } from "@/components/sticker-creator"
import { ReaderSidebar } from "@/components/reader-sidebar"
import { ChatPanel } from "@/components/chat-panel"
import { AIAssistantSidebar } from "@/components/ai-assistant-sidebar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, ArrowLeft, Loader2, MessageSquare, PanelRightClose, PanelRight, Sparkles } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ReadPage({ params }: PageProps) {
  const { id: fileId } = use(params)
  const [file, setFile] = useState<File | null>(null)
  const [members, setMembers] = useState<(FileMember & { user?: Profile; progress?: ReadingProgress })[]>([])
  const [stickyNotes, setStickyNotes] = useState<(StickyNoteType & { author?: Profile })[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [quickStickerData, setQuickStickerData] = useState<{ title: string; content: string } | null>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    setCurrentUserId(user.id)

    // Fetch file
    const { data: fileData, error: fileError } = await supabase.from("files").select("*").eq("id", fileId).single()

    if (fileError || !fileData) {
      toast({
        title: "File not found",
        description: "This document doesn't exist or you don't have access.",
        variant: "destructive",
      })
      router.push("/library")
      return
    }

    setFile(fileData)

    // Fetch members with their profiles and reading progress
    const { data: membersData } = await supabase
      .from("file_members")
      .select(`
        *,
        user:profiles(*),
        progress:reading_progress(*)
      `)
      .eq("file_id", fileId)

    const membersWithProgress =
      membersData?.map((m) => ({
        ...m,
        progress: Array.isArray(m.progress)
          ? m.progress.find((p: ReadingProgress) => p.user_id === m.user_id)
          : m.progress,
      })) || []

    setMembers(membersWithProgress)

    // Get user's reading progress
    const { data: progress } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("file_id", fileId)
      .eq("user_id", user.id)
      .single()

    if (progress) {
      setCurrentPage(progress.current_page)
    }

    // Fetch sticky notes for current page
    fetchStickyNotes(user.id)

    setIsLoading(false)
  }, [fileId, supabase, router, toast])

  const fetchStickyNotes = async (userId?: string) => {
    const uid = userId || currentUserId
    if (!uid) return

    const { data: notes } = await supabase
      .from("sticky_notes")
      .select(`
        *,
        author:profiles(*)
      `)
      .eq("file_id", fileId)
      .eq("page_number", currentPage)

    setStickyNotes(notes || [])
  }

  useEffect(() => {
    fetchData()

    // Set up presence tracking
    if (currentUserId && fileId) {
      const presenceChannel = supabase.channel(`presence:file:${fileId}`, {
        config: {
          presence: {
            key: currentUserId,
          },
        },
      })

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState()
          const userIds = Object.keys(state)
          setOnlineUsers(userIds)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: currentUserId,
              online_at: new Date().toISOString(),
            })
          }
        })

      return () => {
        presenceChannel.unsubscribe()
      }
    }
  }, [fetchData, currentUserId, fileId, supabase])

  useEffect(() => {
    if (currentUserId) {
      fetchStickyNotes()
    }
  }, [currentPage, currentUserId])

  // Update reading progress when page changes
  useEffect(() => {
    if (!currentUserId || !fileId) return

    const updateProgress = async () => {
      await supabase.from("reading_progress").upsert(
        {
          file_id: fileId,
          user_id: currentUserId,
          current_page: currentPage,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "file_id,user_id" },
      )

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: currentUserId,
        file_id: fileId,
        action_type: "page_viewed",
        metadata: { page: currentPage },
      })
    }

    const debounce = setTimeout(updateProgress, 1000)
    return () => clearTimeout(debounce)
  }, [currentPage, currentUserId, fileId, supabase])

  const handleCreateSticker = async (title: string, content: string, metadata: string, x: number, y: number) => {
    if (!currentUserId) return

    setIsCreatingNote(true)
    try {
      const { data: note, error } = await supabase
        .from("sticky_notes")
        .insert({
          file_id: fileId,
          author_id: currentUserId,
          page_number: currentPage,
          content: title ? `${title}\n\n${content}` : content,
          color: metadata, // Store icon:shape:color metadata in color field
          position_x: x,
          position_y: y,
          is_surprise: true,
        })
        .select(`*, author:profiles(*)`)
        .single()

      if (error) throw error

      setStickyNotes((prev) => [...prev, note])

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: currentUserId,
        file_id: fileId,
        action_type: "sticky_note_created",
        metadata: { page: currentPage, note_id: note.id },
      })

      toast({
        title: "Sticker added",
        description: "Your friends will discover this when they reach this page!",
      })
    } catch {
      toast({
        title: "Failed to create sticker",
        description: "There was an error saving your sticker.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingNote(false)
      setQuickStickerData(null)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await supabase.from("sticky_notes").delete().eq("id", noteId)
      setStickyNotes((prev) => prev.filter((n) => n.id !== noteId))
      toast({ title: "Sticker deleted" })
    } catch {
      toast({
        title: "Failed to delete",
        description: "There was an error deleting your sticker.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateNotePosition = async (noteId: string, x: number, y: number) => {
    try {
      await supabase
        .from("sticky_notes")
        .update({ position_x: x, position_y: y })
        .eq("id", noteId)
    } catch {
      console.error("Failed to update sticker position")
    }
  }

  const handleTotalPagesChange = async (total: number) => {
    if (file && file.total_pages !== total) {
      await supabase.from("files").update({ total_pages: total }).eq("id", fileId)
      setFile((prev) => (prev ? { ...prev, total_pages: total } : null))
    }
  }

  const handleTextSelect = (text: string, page: number) => {
    if (text.length > 10) {
      setSelectedText(text)
      setShowAIAssistant(true)
    }
  }

  const handleCreateStickyFromAI = (title: string, content: string) => {
    setQuickStickerData({ title, content })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!file) {
    return null
  }

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
            variant={showAIAssistant ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => setShowAIAssistant(!showAIAssistant)}
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </Button>

          <Button
            variant={showChat ? "default" : "ghost"}
            size="icon"
            title="Chat"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* PDF Viewer */}
        <div className="flex-1 min-w-0" ref={pageContainerRef}>
          <PDFViewer
            fileUrl={file.file_url}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onTotalPagesChange={handleTotalPagesChange}
            onTextSelect={handleTextSelect}
          >
            {/* Stickers Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full pointer-events-auto">
                {stickyNotes.map((note) => (
                  <Sticker
                    key={note.id}
                    note={note}
                    isOwn={note.author_id === currentUserId}
                    onDelete={() => handleDeleteNote(note.id)}
                    onDragEnd={(x, y) => handleUpdateNotePosition(note.id, x, y)}
                    containerRef={pageContainerRef}
                  />
                ))}
              </div>
            </div>
          </PDFViewer>
        </div>

        {/* Sidebar */}
        {showSidebar && !showAIAssistant && (
          <ReaderSidebar
            file={file}
            members={members}
            currentUserId={currentUserId || ""}
            onlineUserIds={onlineUsers}
          />
        )}
      </div>

      {currentUserId && (
        <ChatPanel fileId={fileId} currentUserId={currentUserId} isOpen={showChat} onClose={() => setShowChat(false)} />
      )}

      {/* AI Assistant Sidebar */}
      <AIAssistantSidebar
        isOpen={showAIAssistant}
        onClose={() => {
          setShowAIAssistant(false)
          setSelectedText(null)
        }}
        selectedText={selectedText}
        fileId={fileId}
        pageNumber={currentPage}
        onCreateStickyNote={handleCreateStickyFromAI}
      />

      {/* Quick Sticker Creator (from AI response) */}
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
