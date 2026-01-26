import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Get messages for a chat
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const chatId = searchParams.get("chatId")

  if (!chatId) {
    return NextResponse.json({ error: "Missing chatId" }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // First verify the chat belongs to the user
  const { data: chat } = await supabase
    .from("assistant_chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single()

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }

  const { data: messages, error } = await supabase
    .from("assistant_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages })
}

// POST - Save messages to a chat
export async function POST(req: Request) {
  const supabase = await createClient()
  const { chatId, messages } = await req.json()

  if (!chatId || !messages) {
    return NextResponse.json({ error: "Missing chatId or messages" }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify the chat belongs to the user
  const { data: chat } = await supabase
    .from("assistant_chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single()

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }

  // Insert messages
  const messagesToInsert = messages.map((m: { role: string; content: string }) => ({
    chat_id: chatId,
    role: m.role,
    content: m.content,
  }))

  const { error } = await supabase.from("assistant_messages").insert(messagesToInsert)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
