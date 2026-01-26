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
  ChevronLeft,
  Plus,
  MessageSquare,
  Trash2,
  History,
  Quote,
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
  const [showHistory, setShowHistory] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastSavedMessageCountRef = useRef<number>(0)

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

  // Handle new highlighted text - set it as pending context for new messages
  useEffect(() => {
    if (selectedText && selectedText !== currentHighlight) {
      // Only set highlight if we're starting fresh (no messages yet)
      // or if we want to add new context to the conversation
      if (messages.length === 0) {
        setCurrentHighlight(selectedText)
      } else {
        // If there are already messages, add the new highlight as context
        // but don't show the preview box - it will be included in the next message
        setCurrentHighlight(selectedText)
      }
    }
  }, [selectedText, currentHighlight, messages.length])

  // Clear the highlight preview after first message is sent
  // The highlight is already in the system prompt context
  useEffect(() => {
    if (messages.length > 0 && currentHighlight) {
      // After the first user message, clear the visible highlight
      // The context is still in the system prompt
      setCurrentHighlight(null)
    }
  }, [messages.length, currentHighlight])

  // Save NEW messages to current chat (only messages that weren't loaded from DB)
  const saveNewMessages = useCallback(async (messagesToSave: typeof messages) => {
    if (!currentChatId || messagesToSave.length === 0 || isLoadingFromDb) return

    try {
      await fetch("/api/assistant-chats/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: currentChatId,
          messages: messagesToSave.map(m => ({ role: m.role, content: m.content })),
        }),
      })
    } catch (error) {
      console.error("Failed to save messages:", error)
    }
  }, [currentChatId, isLoadingFromDb])

  // Auto-save when assistant finishes responding (only new messages)
  useEffect(() => {
    if (!isLoading && messages.length > 0 && currentChatId && !isLoadingFromDb) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant" && messages.length > lastSavedMessageCountRef.current) {
        // Only save messages that are new since last save
        const newMessages = messages.slice(lastSavedMessageCountRef.current)
        if (newMessages.length > 0) {
          saveNewMessages(newMessages)
          lastSavedMessageCountRef.current = messages.length
        }
      }
    }
  }, [isLoading, messages, currentChatId, isLoadingFromDb, saveNewMessages])

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
    setCurrentChatId(null)
    setMessages([])
    setCurrentHighlight(null)
    lastSavedMessageCountRef.current = 0
    setShowHistory(false)
  }

  // Load a chat from history
  const handleLoadChat = async (chat: Chat) => {
    setIsLoadingFromDb(true)
    setCurrentChatId(chat.id)
    setCurrentHighlight(null) // Don't show old highlight, it's in the messages
    setShowHistory(false)

    try {
      const res = await fetch(`/api/assistant-chats/messages?chatId=${chat.id}`)
      const data = await res.json()
      if (data.messages) {
        const loadedMessages = data.messages.map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
        setMessages(loadedMessages)
        // Mark all loaded messages as "saved" so we don't re-save them
        lastSavedMessageCountRef.current = loadedMessages.length
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    } finally {
      // Small delay to ensure state is set before allowing saves
      setTimeout(() => {
        setIsLoadingFromDb(false)
      }, 100)
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
        lastSavedMessageCountRef.current = 0
      }
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }

  const handleQuickAction = async (action: (typeof QUICK_ACTIONS)[0]) => {
    // Create a new chat if needed
    let chatId = currentChatId
    if (!chatId) {
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
          chatId = data.chat.id
          lastSavedMessageCountRef.current = 0
        }
      } catch (error) {
        console.error("Failed to create chat:", error)
        return
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

    // Create a new chat if needed
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
          lastSavedMessageCountRef.current = 0
        }
      } catch (error) {
        console.error("Failed to create chat:", error)
        return
      }
    } else if (messages.length === 0) {
      // Update title with first message
      updateChatTitle(currentChatId, input)
    }

    handleSubmit(e)
  }

  const handleCreateNote = (messageContent: string) => {
    if (onCreateStickyNote) {
      const title = "AI Response"
      onCreateStickyNote(title, messageContent)
    }
  }

  if (!isOpen) return null

  // Check if we should show the highlight preview (only before first message)
  const showHighlightPreview = currentHighlight && messages.length === 0

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
            {/* Messages - Scrollable Area */}
            <div
              className="flex-1 overflow-y-auto min-h-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="p-4 space-y-4">
                {/* Empty state */}
                {messages.length === 0 && !showHighlightPreview && (
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

                {/* Highlighted text preview - only shown before first message */}
                {showHighlightPreview && (
                  <div className="space-y-4">
                    {/* Context card */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Quote className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-primary mb-1">Selected text</p>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                            {currentHighlight}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">What would you like to do?</p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_ACTIONS.map((action) => (
                          <Button
                            key={action.label}
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1.5"
                            onClick={() => handleQuickAction(action)}
                            disabled={isLoading}
                          >
                            <action.icon className="w-3.5 h-3.5" />
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
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
                  placeholder={showHighlightPreview ? "Ask about this text..." : "Ask anything..."}
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
