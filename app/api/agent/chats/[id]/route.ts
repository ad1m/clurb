import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/agent/chats/[id] - Get a specific chat with its messages
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the chat
  const { data: chat, error: chatError } = await supabase
    .from("agent_chats")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (chatError || !chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }

  // Get messages for the chat
  const { data: messages, error: messagesError } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("chat_id", id)
    .order("created_at", { ascending: true })

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 })
  }

  return NextResponse.json({ ...chat, messages: messages || [] })
}

// PATCH /api/agent/chats/[id] - Update chat title
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { title } = body

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const { data: chat, error } = await supabase
    .from("agent_chats")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error || !chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }

  return NextResponse.json(chat)
}

// DELETE /api/agent/chats/[id] - Delete a chat
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await supabase
    .from("agent_chats")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
