import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/agent/chats - List all chats for the current user
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: chats, error } = await supabase
    .from("agent_chats")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(chats)
}

// POST /api/agent/chats - Create a new chat
export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const title = body.title || "New Chat"

  const { data: chat, error } = await supabase
    .from("agent_chats")
    .insert({
      user_id: user.id,
      title,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(chat)
}
