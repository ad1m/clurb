"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sparkles,
  X,
  Loader2,
  Lightbulb,
  FileText,
  ImageIcon,
  Send,
  Maximize2,
  Minimize2,
  StickyNote,
  ChevronDown,
  ChevronLeft,
  Plus,
  MessageSquare,
  Trash2,
  History,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Chat {
  id: string
  title: string
  highlighted_text?: string | null
  page_number?: number | null
  created_at: string
  updated_at: string
}

interface AIAssistantSidebarProps {
  isOpen: boolean
  onClose: () => void
  selectedText?: string | null
  fileId: string
  pageNumber: number
  onCreateStickyNote?: (title: string, content: string) => void
}

const QUICK_ACTIONS = [
  { icon: Lightbulb, label: "Explain", prompt: "Explain this in simple terms" },
  { icon: FileText, label: "Summarize", prompt: "Summarize the key points" },
  { icon: ImageIcon, label: "Visualize", prompt: "Describe an image that would represent this" },
]

export function AIAssistantSidebar({
  isOpen,
  onClose,
  selectedText,
  fileId,
  pageNumber,
  onCreateStickyNote,
}: AIAssistantSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFullText, setShowFullText] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append } = useChat({
    api: "/api/highlight-ai",
    body: {
      fileId,
      pageNumber,
      selectedText: currentHighlight || "",
      chatId: currentChatId,
    },
  })

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Fetch chat history
  const fetchChats = useCallback(async () => {
    if (!fileId) return
    setIsLoadingChats(true)
    try {
      const res = await fetch(`/api/assistant-chats?fileId=${fileId}`)
      const data = await res.json()
      if (data.chats) {
        setChats(data.chats)
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error)
    } finally {
      setIsLoadingChats(false)
    }
  }, [fileId])

  // Load chats when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchChats()
    }
  }, [isOpen, fetchChats])

  // Handle new highlighted text - add to current context without resetting
  useEffect(() => {
    if (selectedText && selectedText !== currentHighlight) {
      setCurrentHighlight(selectedText)
      // Don't reset messages - keep conversation history
      // The highlighted text will be added to system prompt context
    }
  }, [selectedText, currentHighlight])

  // Save messages to current chat
  const saveMessages = useCallback(async () => {
    if (!currentChatId || messages.length === 0 || isSaving) return

    setIsSaving(true)
    try {
      // Only save the last two messages (user + assistant response)
      const lastUserIdx = messages.findLastIndex(m => m.role === "user")
      if (lastUserIdx >= 0) {
        const newMessages = messages.slice(lastUserIdx).filter(m =>
          typeof m.content === "string" && m.content.trim().length > 0
        )
        if (newMessages.length > 0) {
          await fetch("/api/assistant-chats/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: currentChatId,
              messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            }),
          })
        }
      }
    } catch (error) {
      console.error("Failed to save messages:", error)
    } finally {
      setIsSaving(false)
    }
  }, [currentChatId, messages, isSaving])

  // Auto-save when assistant finishes responding
  useEffect(() => {
    if (!isLoading && messages.length > 0 && currentChatId) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        saveMessages()
      }
    }
  }, [isLoading, messages, currentChatId, saveMessages])

  // Auto-generate chat title from first message
  const updateChatTitle = useCallback(async (chatId: string, firstMessage: string) => {
    try {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "")
      await fetch("/api/assistant-chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, title }),
      })
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, title } : c))
    } catch (error) {
      console.error("Failed to update chat title:", error)
    }
  }, [])

  // Create new chat session
  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/assistant-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          title: "New Chat",
          highlightedText: currentHighlight,
          pageNumber,
        }),
      })
      const data = await res.json()
      if (data.chat) {
        setChats(prev => [data.chat, ...prev])
        setCurrentChatId(data.chat.id)
        setMessages([])
        setShowHistory(false)
      }
    } catch (error) {
      console.error("Failed to create chat:", error)
    }
  }

  // Load a chat from history
  const handleLoadChat = async (chat: Chat) => {
    setCurrentChatId(chat.id)
    setCurrentHighlight(chat.highlighted_text || null)
    setShowHistory(false)

    try {
      const res = await fetch(`/api/assistant-chats/messages?chatId=${chat.id}`)
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages.map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        })))
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    }
  }

  // Delete a chat
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/assistant-chats?chatId=${chatId}`, { method: "DELETE" })
      setChats(prev => prev.filter(c => c.id !== chatId))
      if (currentChatId === chatId) {
        setCurrentChatId(null)
        setMessages([])
      }
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }

  const handleQuickAction = async (action: (typeof QUICK_ACTIONS)[0]) => {
    // If no current chat, create one first
    if (!currentChatId) {
      try {
        const res = await fetch("/api/assistant-chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId,
            title: action.label,
            highlightedText: currentHighlight,
            pageNumber,
          }),
        })
        const data = await res.json()
        if (data.chat) {
          setChats(prev => [data.chat, ...prev])
          setCurrentChatId(data.chat.id)
        }
      } catch (error) {
        console.error("Failed to create chat:", error)
      }
    }

    append({
      role: "user",
      content: action.prompt,
    })
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // If no current chat, create one first
    if (!currentChatId) {
      try {
        const res = await fetch("/api/assistant-chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId,
            title: input.slice(0, 50),
            highlightedText: currentHighlight,
            pageNumber,
          }),
        })
        const data = await res.json()
        if (data.chat) {
          setChats(prev => [data.chat, ...prev])
          setCurrentChatId(data.chat.id)
        }
      } catch (error) {
        console.error("Failed to create chat:", error)
      }
    } else if (messages.length === 0) {
      // Update title with first message
      updateChatTitle(currentChatId, input)
    }

    handleSubmit(e)
  }

  const handleCreateNote = (messageContent: string) => {
    if (onCreateStickyNote) {
      const title = currentHighlight?.slice(0, 50) || "AI Response"
      onCreateStickyNote(title + (currentHighlight && currentHighlight.length > 50 ? "..." : ""), messageContent)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop for expanded mode */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full bg-background border-l border-border flex flex-col z-50 transition-all duration-300 ease-out",
          isExpanded ? "w-[600px]" : "w-[400px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {showHistory ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowHistory(false)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-semibold">{showHistory ? "Chat History" : "AI Assistant"}</span>
          </div>
          <div className="flex items-center gap-1">
            {!showHistory && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowHistory(true)}
                  title="Chat history"
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNewChat}
                  title="New chat"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat History Panel */}
        {showHistory ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <Button
                variant="outline"
                className="w-full mb-4 gap-2"
                onClick={handleNewChat}
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>

              {isLoadingChats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No chat history yet</p>
                  <p className="text-xs mt-1">Start a new conversation!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors group",
                        currentChatId === chat.id
                          ? "bg-primary/10 border-primary/30"
                          : "bg-card border-border hover:bg-muted"
                      )}
                      onClick={() => handleLoadChat(chat)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{chat.title}</p>
                          {chat.page_number && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Page {chat.page_number}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(chat.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Selected Text Preview */}
            {currentHighlight && (
              <div className="px-4 py-3 border-b border-border bg-muted/30 shrink-0">
                <div
                  className={cn(
                    "bg-card rounded-lg p-3 border border-border transition-all",
                    !showFullText && "max-h-24 overflow-hidden relative"
                  )}
                >
                  <p className="text-sm text-muted-foreground italic leading-relaxed">"{currentHighlight}"</p>
                  {!showFullText && currentHighlight.length > 200 && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
                  )}
                </div>
                {currentHighlight.length > 200 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs gap-1"
                    onClick={() => setShowFullText(!showFullText)}
                  >
                    <ChevronDown className={cn("w-3 h-3 transition-transform", showFullText && "rotate-180")} />
                    {showFullText ? "Show less" : "Show full text"}
                  </Button>
                )}
              </div>
            )}

            {/* Quick Actions */}
            {currentHighlight && messages.length === 0 && (
              <div className="px-4 py-3 border-b border-border shrink-0">
                <p className="text-xs text-muted-foreground mb-2">Quick actions</p>
                <div className="flex gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => handleQuickAction(action)}
                      disabled={isLoading}
                    >
                      <action.icon className="w-3.5 h-3.5" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages - Scrollable Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto min-h-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="p-4 space-y-4">
                {messages.length === 0 && !currentHighlight && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">AI Assistant</h3>
                    <p className="text-sm text-muted-foreground max-w-[240px]">
                      Highlight text in the document or ask me anything about your reading
                    </p>
                  </div>
                )}

                {messages.length === 0 && currentHighlight && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Choose a quick action above or ask a question below
                    </p>
                  </div>
                )}

                {messages
                  .filter((m) => {
                    if (m.role === "user") return true
                    const content = typeof m.content === "string" ? m.content : ""
                    return content.trim().length > 0
                  })
                  .map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}
                    >
                      {message.role === "assistant" ? (
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-primary-foreground" />
                        </div>
                      ) : (
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="bg-secondary text-sm">U</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card border border-border rounded-tl-sm"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

                        {/* Create Sticky Note Button for assistant messages */}
                        {message.role === "assistant" && onCreateStickyNote && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs gap-1.5 h-7 px-2 -ml-1"
                            onClick={() => handleCreateNote(message.content as string)}
                          >
                            <StickyNote className="w-3 h-3" />
                            Create Sticker
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border shrink-0">
              <form onSubmit={handleFormSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder={currentHighlight ? "Ask about this text..." : "Ask anything..."}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  )
}
