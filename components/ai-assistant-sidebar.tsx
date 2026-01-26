"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AIAssistantSidebarProps {
  isOpen: boolean
  onClose: () => void
  selectedText?: string | null
  fileId: string
  pageNumber: number
  onCreateStickyNote?: (title: string, content: string) => void
}

const QUICK_ACTIONS = [
  { icon: Lightbulb, label: "Explain", prompt: "Explain this passage in simple terms:" },
  { icon: FileText, label: "Summarize", prompt: "Summarize the key points of this passage:" },
  { icon: ImageIcon, label: "Visualize", prompt: "Describe an image that would represent this passage:" },
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
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append } = useChat({
    api: "/api/highlight-ai",
    body: {
      fileId,
      pageNumber,
      selectedText: selectedText || "",
    },
  })

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Reset messages when selected text changes
  useEffect(() => {
    if (selectedText) {
      setMessages([])
    }
  }, [selectedText, setMessages])

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[0]) => {
    append({
      role: "user",
      content: `${action.prompt}\n\n"${selectedText}"`,
    })
  }

  const handleCreateNote = (messageContent: string) => {
    if (onCreateStickyNote && selectedText) {
      const title = selectedText.slice(0, 50) + (selectedText.length > 50 ? "..." : "")
      onCreateStickyNote(title, messageContent)
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
          "fixed right-0 top-0 h-full bg-background border-l border-border flex flex-col z-50 transition-all duration-300",
          isExpanded ? "w-[600px]" : "w-[380px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">AI Assistant</span>
          </div>
          <div className="flex items-center gap-1">
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

        {/* Selected Text Preview */}
        {selectedText && (
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div
              className={cn(
                "bg-card rounded-lg p-3 border border-border transition-all",
                !showFullText && "max-h-24 overflow-hidden relative"
              )}
            >
              <p className="text-sm text-muted-foreground italic">"{selectedText}"</p>
              {!showFullText && selectedText.length > 200 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
              )}
            </div>
            {selectedText.length > 200 && (
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
        {selectedText && messages.length === 0 && (
          <div className="px-4 py-3 border-b border-border">
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

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 && !selectedText && (
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

            {messages.length === 0 && selectedText && (
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
                    <Avatar className="w-8 h-8">
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

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
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask anything about this text..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
