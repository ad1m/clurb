"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useChat, type Message } from "@ai-sdk/react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Profile, AgentChat } from "@/lib/types"
import { LibraryHeader } from "@/components/library-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sparkles,
  Send,
  Loader2,
  BookOpen,
  BarChart3,
  StickyNote,
  Users,
  Plus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ReadingChart } from "@/components/reading-chart"

const SUGGESTED_PROMPTS = [
  { icon: BookOpen, text: "What was the last book I was reading?" },
  { icon: BarChart3, text: "Show me my reading activity over the last week" },
  { icon: StickyNote, text: "What notes have my friends left in my files?" },
  { icon: Users, text: "Give me a summary of my reading stats" },
]

export default function AgentPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chats, setChats] = useState<AgentChat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [chatToRename, setChatToRename] = useState<AgentChat | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [isSavingMessages, setIsSavingMessages] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastSavedMessageCount = useRef(0)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading: isChatLoading,
    setInput,
    setMessages,
  } = useChat({
    api: "/api/agent",
  })

  // Fetch profile and chats on mount
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setProfile(profileData)

      // Fetch chats
      const response = await fetch("/api/agent/chats")
      if (response.ok) {
        const chatsData = await response.json()
        setChats(chatsData)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [supabase, router])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Save messages to database when chat is done loading
  useEffect(() => {
    const saveMessages = async () => {
      if (!currentChatId || isChatLoading || isSavingMessages) return
      if (messages.length === 0) return
      if (messages.length <= lastSavedMessageCount.current) return

      setIsSavingMessages(true)

      try {
        // Save only new messages
        const newMessages = messages.slice(lastSavedMessageCount.current)

        for (const message of newMessages) {
          // Only save messages with actual content
          const content = typeof message.content === "string" ? message.content : ""
          if (!content.trim()) continue

          await fetch(`/api/agent/chats/${currentChatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: message.role,
              content: content,
            }),
          })
        }

        lastSavedMessageCount.current = messages.length

        // Generate title if this is the first user message
        const userMessages = messages.filter(m => m.role === "user")
        const chat = chats.find(c => c.id === currentChatId)
        if (userMessages.length === 1 && chat?.title === "New Chat") {
          const titleResponse = await fetch(`/api/agent/chats/${currentChatId}/generate-title`, {
            method: "POST",
          })
          if (titleResponse.ok) {
            const updatedChat = await titleResponse.json()
            setChats(prev => prev.map(c => c.id === currentChatId ? updatedChat : c))
          }
        }
      } catch (error) {
        console.error("Error saving messages:", error)
      } finally {
        setIsSavingMessages(false)
      }
    }

    saveMessages()
  }, [messages, currentChatId, isChatLoading, isSavingMessages, chats])

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const createNewChat = async () => {
    setIsCreatingChat(true)
    try {
      const response = await fetch("/api/agent/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      })

      if (response.ok) {
        const newChat = await response.json()
        setChats(prev => [newChat, ...prev])
        setCurrentChatId(newChat.id)
        setMessages([])
        lastSavedMessageCount.current = 0
      }
    } catch (error) {
      console.error("Error creating chat:", error)
    } finally {
      setIsCreatingChat(false)
    }
  }

  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/agent/chats/${chatId}`)
      if (response.ok) {
        const chatWithMessages = await response.json()
        setCurrentChatId(chatId)

        // Convert database messages to AI SDK format
        const aiMessages: Message[] = chatWithMessages.messages.map((m: { id: string; role: "user" | "assistant"; content: string; created_at: string }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: new Date(m.created_at),
        }))

        setMessages(aiMessages)
        lastSavedMessageCount.current = aiMessages.length
      }
    } catch (error) {
      console.error("Error loading chat:", error)
    }
  }

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/agent/chats/${chatId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setChats(prev => prev.filter(c => c.id !== chatId))
        if (currentChatId === chatId) {
          setCurrentChatId(null)
          setMessages([])
          lastSavedMessageCount.current = 0
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error)
    }
  }

  const openRenameDialog = (chat: AgentChat) => {
    setChatToRename(chat)
    setNewTitle(chat.title)
    setRenameDialogOpen(true)
  }

  const handleRename = async () => {
    if (!chatToRename || !newTitle.trim()) return

    try {
      const response = await fetch(`/api/agent/chats/${chatToRename.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      })

      if (response.ok) {
        const updatedChat = await response.json()
        setChats(prev => prev.map(c => c.id === chatToRename.id ? updatedChat : c))
      }
    } catch (error) {
      console.error("Error renaming chat:", error)
    } finally {
      setRenameDialogOpen(false)
      setChatToRename(null)
      setNewTitle("")
    }
  }

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Create a new chat if none exists
    if (!currentChatId && input.trim()) {
      setIsCreatingChat(true)
      try {
        const response = await fetch("/api/agent/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "New Chat" }),
        })

        if (response.ok) {
          const newChat = await response.json()
          setChats(prev => [newChat, ...prev])
          setCurrentChatId(newChat.id)
          lastSavedMessageCount.current = 0
        }
      } catch (error) {
        console.error("Error creating chat:", error)
        return
      } finally {
        setIsCreatingChat(false)
      }
    }

    // Submit to AI
    originalHandleSubmit(e)
  }, [currentChatId, input, originalHandleSubmit])

  const initials =
    profile?.display_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    profile?.username?.[0]?.toUpperCase() ||
    "?"

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LibraryHeader profile={profile} />

      <div className="flex-1 pt-16 flex">
        {/* Sidebar */}
        <div
          className={cn(
            "border-r border-border bg-card/50 flex flex-col transition-all duration-300 overflow-hidden",
            sidebarOpen ? "w-72" : "w-14"
          )}
        >
          {/* Sidebar Header - Always visible */}
          <div className="p-3 flex items-center gap-2 border-b border-border">
            {/* Sidebar Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeft className="w-5 h-5" />
              )}
            </Button>

            {/* New Chat Button - only show when sidebar is open */}
            {sidebarOpen && (
              <button
                onClick={createNewChat}
                disabled={isCreatingChat}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground bg-accent/30 hover:bg-accent/50 transition-colors disabled:opacity-50"
              >
                {isCreatingChat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                New Chat
              </button>
            )}
          </div>

          {sidebarOpen && (
            <>
              {/* Chat History */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Chat History</p>
                  {chats.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                      No chats yet
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {chats.map((chat) => (
                        <div
                          key={chat.id}
                          className={cn(
                            "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors",
                            currentChatId === chat.id && "bg-accent"
                          )}
                          onClick={() => loadChat(chat.id)}
                        >
                          <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{chat.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatChatDate(chat.updated_at)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                openRenameDialog(chat)
                              }}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteChat(chat.id)
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Hi {profile?.display_name || profile?.username},</h1>
              <p className="text-muted-foreground text-lg mb-8">What can I help you with today?</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <Card
                    key={i}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => handleSuggestedPrompt(prompt.text)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <prompt.icon className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm">{prompt.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <ScrollArea className="flex-1 py-6" ref={scrollRef}>
              <div className="space-y-6">
                {messages
                  // Filter out assistant messages with no content (intermediate tool-only messages)
                  .filter((message) => {
                    if (message.role === "user") return true
                    // Only show assistant messages that have actual text content
                    const content = typeof message.content === "string" ? message.content : ""
                    return content.trim().length > 0
                  })
                  .map((message) => {
                    // Check if this message has a chart to display
                    const chartInvocation = message.toolInvocations?.find(
                      (t) => t.state === "result" && t.toolName === "getDailyReadingStats"
                    )
                    const chartData = chartInvocation && "result" in chartInvocation ? chartInvocation.result?.data : null

                    const content = typeof message.content === "string" ? message.content : ""

                    return (
                      <div key={message.id} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
                        {message.role === "assistant" ? (
                          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-primary-foreground" />
                          </div>
                        ) : (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-secondary text-sm">{initials}</AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-card border border-border rounded-tl-sm",
                          )}
                        >
                          {chartData && (
                            <div className="mb-3">
                              <ReadingChart data={chartData as { date: string; pages: number }[]} />
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-wrap">{content}</div>
                        </div>
                      </div>
                    )
                  })}
                {isChatLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input */}
          <div className="py-4 sticky bottom-0 bg-background">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your reading activity..."
                className="flex-1"
                disabled={isChatLoading || isCreatingChat}
              />
              <Button type="submit" disabled={!input.trim() || isChatLoading || isCreatingChat}>
                {isChatLoading || isCreatingChat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </main>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new title..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleRename()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
