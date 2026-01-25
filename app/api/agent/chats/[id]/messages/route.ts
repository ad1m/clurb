import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/agent/chats/[id]/messages - Add a message to a chat
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify the chat belongs to the user
  const { data: chat, error: chatError } = await supabase
    .from("agent_chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single()

  if (chatError || !chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }

  const body = await req.json()
  const { role, content } = body

  if (!role || !content) {
    return NextResponse.json({ error: "Role and content are required" }, { status: 400 })
  }

  if (role !== "user" && role !== "assistant") {
    return NextResponse.json({ error: "Role must be 'user' or 'assistant'" }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from("agent_messages")
    .insert({
      chat_id: chatId,
      role,
      content,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(message)
}
