"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, X, Loader2, Lightbulb, FileText, ImageIcon, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIHighlightPopupProps {
  selectedText: string
  position: { x: number; y: number }
  onClose: () => void
  fileId: string
  pageNumber: number
}

const QUICK_ACTIONS = [
  { icon: Lightbulb, label: "Explain", prompt: "Explain this passage in simple terms:" },
  { icon: FileText, label: "Summarize", prompt: "Summarize the key points of this passage:" },
  { icon: ImageIcon, label: "Visualize", prompt: "Describe an image that would represent this passage:" },
]

export function AIHighlightPopup({ selectedText, position, onClose, fileId, pageNumber }: AIHighlightPopupProps) {
  const [customPrompt, setCustomPrompt] = useState("")
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const { messages, append, isLoading, setMessages } = useChat({
    api: "/api/highlight-ai",
    body: {
      fileId,
      pageNumber,
      selectedText,
    },
  })

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[0]) => {
    setActiveAction(action.label)
    setMessages([])
    append({
      role: "user",
      content: `${action.prompt}\n\n"${selectedText}"`,
    })
  }

  const handleCustomPrompt = () => {
    if (!customPrompt.trim()) return
    setActiveAction("Custom")
    setMessages([])
    append({
      role: "user",
      content: `${customPrompt}\n\nText: "${selectedText}"`,
    })
    setCustomPrompt("")
  }

  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()

  return (
    <Card
      className="fixed z-50 w-80 shadow-xl"
      style={{
        left: Math.min(position.x, window.innerWidth - 340),
        top: Math.min(position.y + 10, window.innerHeight - 400),
      }}
    >
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-medium text-sm">AI Assistant</span>
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Selected text preview */}
        <div className="bg-muted/50 rounded-lg p-2 mb-3 max-h-20 overflow-y-auto">
          <p className="text-xs text-muted-foreground line-clamp-3">"{selectedText}"</p>
        </div>

        {/* Quick actions */}
        {!activeAction && (
          <div className="flex gap-2 mb-3">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1 bg-transparent"
                onClick={() => handleQuickAction(action)}
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Response */}
        {activeAction && (
          <div className="mb-3">
            <div
              className={cn("bg-card border rounded-lg p-3 text-sm", isLoading && "flex items-center justify-center")}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <p className="whitespace-pre-wrap">{lastAssistantMessage?.content || "Processing..."}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setActiveAction(null)}>
              Ask something else
            </Button>
          </div>
        )}

        {/* Custom prompt */}
        {!activeAction && (
          <div className="flex gap-2">
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ask anything about this text..."
              className="min-h-[60px] text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleCustomPrompt()
                }
              }}
            />
            <Button
              size="icon"
              className="shrink-0 self-end"
              onClick={handleCustomPrompt}
              disabled={!customPrompt.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
