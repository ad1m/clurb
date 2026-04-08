"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { AgentChat } from "@/lib/types"
import { LibraryHeader } from "@/components/library-header"
import { Button } from "@/components/ui/button"
import { Loader2, MessageSquare, ChevronLeft, ChevronRight, Pencil, Trash2, ArrowLeft } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

export default function AllChatsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [chats, setChats] = useState<AgentChat[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [chatToRename, setChatToRename] = useState<AgentChat | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const meRes = await fetch("/api/auth/me")
      if (!meRes.ok) { router.push("/auth/login"); return }
      const { user: u } = await meRes.json()
      setUser(u)

      const res = await fetch(`/api/agent/chats?page=${page}&limit=${PAGE_SIZE}`)
      if (res.ok) {
        const data = await res.json()
        setChats(data.chats ?? [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
      }
      setIsLoading(false)
    }
    load()
  }, [page, router])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const handleRename = async () => {
    if (!chatToRename || !newTitle.trim()) return
    const res = await fetch(`/api/agent/chats/${chatToRename.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setChats((prev) => prev.map((c) => (c.id === chatToRename.id ? updated : c)))
    }
    setRenameDialogOpen(false)
    setChatToRename(null)
    setNewTitle("")
  }

  const handleDelete = async (chatId: string) => {
    const res = await fetch(`/api/agent/chats/${chatId}`, { method: "DELETE" })
    if (res.ok) {
      setChats((prev) => prev.filter((c) => c.id !== chatId))
      setTotal((t) => t - 1)
    }
    setDeleteConfirmId(null)
  }

  const goToPage = (p: number) => router.push(`/agent/chats?page=${p}`)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LibraryHeader user={user} />
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push("/agent")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">All Chats</h1>
            <p className="text-sm text-muted-foreground">{total} conversation{total !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Chat list */}
        {chats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No chats yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors group"
              >
                <button
                  className="flex-1 flex items-center gap-3 min-w-0 text-left"
                  onClick={() => router.push(`/agent?chat=${chat.id}`)}
                >
                  <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title || "New Chat"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(chat.updatedAt)}</p>
                  </div>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setChatToRename(chat); setNewTitle(chat.title || ""); setRenameDialogOpen(true) }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:text-destructive"
                    onClick={() => setDeleteConfirmId(chat.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </main>

      {/* Rename dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={(open) => { setRenameDialogOpen(open); if (!open) { setChatToRename(null); setNewTitle("") } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Chat</DialogTitle></DialogHeader>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Enter new title..." autoFocus onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRename() } }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!newTitle.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Chat?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This conversation will be permanently deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
