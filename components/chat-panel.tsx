"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ChatMessage, Profile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, X, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface ChatPanelProps {
  fileId: string
  currentUserId: string
  isOpen: boolean
  onClose: () => void
}

export function ChatPanel({ fileId, currentUserId, isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<(ChatMessage & { sender?: Profile })[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const fetchMessages = useCallback(async () => {
    // Fetch messages
    const { data } = await supabase
      .from("chat_messages")
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq("file_id", fileId)
      .order("created_at", { ascending: true })
      .limit(100)

    setMessages(data || [])

    // Fetch current user profile for optimistic updates
    if (!currentUserProfile) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .single()
      setCurrentUserProfile(profile)
    }

    setIsLoading(false)
    setTimeout(scrollToBottom, 100)
  }, [fileId, supabase, scrollToBottom, currentUserId, currentUserProfile])

  useEffect(() => {
    if (isOpen) {
      fetchMessages()

      // Subscribe to real-time messages
      const channel = supabase
        .channel(`chat:${fileId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `file_id=eq.${fileId}`,
          },
          async (payload) => {
            // Fetch the sender profile for the new message
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", payload.new.sender_id)
              .single()

            const newMsg = { ...payload.new, sender: profile } as ChatMessage & { sender?: Profile }
            // Prevent duplicates by checking if message already exists
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) {
                return prev
              }
              return [...prev, newMsg]
            })
            setTimeout(scrollToBottom, 100)
          },
        )
        .subscribe((status) => {
          console.log("[v0] Chat subscription status:", status)
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [isOpen, fileId, supabase, fetchMessages, scrollToBottom])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    const messageContent = newMessage.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistic update - add message immediately
    const optimisticMessage: ChatMessage & { sender?: Profile } = {
      id: tempId,
      file_id: fileId,
      sender_id: currentUserId,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender: currentUserProfile || undefined,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage("")
    setTimeout(scrollToBottom, 100)

    setIsSending(true)
    try {
      const { data: insertedMessage } = await supabase
        .from("chat_messages")
        .insert({
          file_id: fileId,
          sender_id: currentUserId,
          content: messageContent,
        })
        .select()
        .single()

      // Replace temp message with real one
      if (insertedMessage) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...insertedMessage, sender: currentUserProfile || undefined }
              : m
          )
        )
      }

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: currentUserId,
        file_id: fileId,
        action_type: "chat_message_sent",
        metadata: { message_length: messageContent.length },
      })
    } catch (error) {
      console.error("Failed to send message:", error)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-0 right-4 w-80 h-[500px] bg-card border border-border rounded-t-xl shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="font-semibold text-sm">Book Chat</h3>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === currentUserId
              const initials =
                message.sender?.display_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() ||
                message.sender?.username?.[0]?.toUpperCase() ||
                "?"

              return (
                <div key={message.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={message.sender?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className={cn("max-w-[200px]", isOwn && "text-right")}>
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm break-words",
                        isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm",
                      )}
                    >
                      {message.content}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-9"
            disabled={isSending}
          />
          <Button type="submit" size="icon" className="h-9 w-9" disabled={!newMessage.trim() || isSending}>
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  )
}
