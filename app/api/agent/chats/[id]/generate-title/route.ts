import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

// POST /api/agent/chats/[id]/generate-title - Auto-generate a title using LLM
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the chat and verify ownership
  const { data: chat, error: chatError } = await supabase
    .from("agent_chats")
    .select("id, title")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single()

  if (chatError || !chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }

  // Get the first user message to generate title from
  const { data: messages } = await supabase
    .from("agent_messages")
    .select("content")
    .eq("chat_id", chatId)
    .eq("role", "user")
    .order("created_at", { ascending: true })
    .limit(1)

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages to generate title from" }, { status: 400 })
  }

  const firstMessage = messages[0].content

  try {
    // Use LLM to generate a short, descriptive title
    const { text } = await generateText({
      model: xai("grok-3-mini"),
      prompt: `Generate a very short title (3-5 words max) for a chat conversation that starts with this message. Only output the title, nothing else. No quotes, no punctuation at the end.

User's first message: "${firstMessage}"

Title:`,
      maxTokens: 20,
    })

    const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 50) // Clean up and limit length

    // Update the chat title
    const { data: updatedChat, error: updateError } = await supabase
      .from("agent_chats")
      .update({ title })
      .eq("id", chatId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updatedChat)
  } catch (error) {
    console.error("Error generating title:", error)
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 })
  }
}
