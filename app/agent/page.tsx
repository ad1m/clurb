"use client"

import { useEffect, useState, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Profile } from "@/lib/types"
import { LibraryHeader } from "@/components/library-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, Send, Loader2, BookOpen, BarChart3, StickyNote, Users } from "lucide-react"
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
  const router = useRouter()
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isChatLoading,
    setInput,
  } = useChat({
    api: "/api/agent",
  })

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setProfile(profileData)
      setIsLoading(false)
    }

    fetchProfile()
  }, [supabase, router])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
  }

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LibraryHeader profile={profile} />

      <main className="flex-1 pt-20 flex flex-col max-w-3xl mx-auto w-full px-4">
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
              disabled={isChatLoading}
            />
            <Button type="submit" disabled={!input.trim() || isChatLoading}>
              {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
