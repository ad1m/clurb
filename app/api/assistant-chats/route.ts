import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - List all chats for a specific file
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get("fileId")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let query = supabase
    .from("assistant_chats")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (fileId) {
    query = query.eq("file_id", fileId)
  }

  const { data: chats, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ chats })
}

// POST - Create a new chat
export async function POST(req: Request) {
  const supabase = await createClient()
  const { fileId, title, highlightedText, pageNumber } = await req.json()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: chat, error } = await supabase
    .from("assistant_chats")
    .insert({
      user_id: user.id,
      file_id: fileId,
      title: title || "New Chat",
      highlighted_text: highlightedText || null,
      page_number: pageNumber || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ chat })
}

// DELETE - Delete a chat
export async function DELETE(req: Request) {
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

  const { error } = await supabase.from("assistant_chats").delete().eq("id", chatId).eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PATCH - Update chat title
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { chatId, title } = await req.json()

  if (!chatId) {
    return NextResponse.json({ error: "Missing chatId" }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: chat, error } = await supabase
    .from("assistant_chats")
    .update({ title })
    .eq("id", chatId)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ chat })
}
