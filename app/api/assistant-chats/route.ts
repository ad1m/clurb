import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { agentChats } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"

// GET /api/assistant-chats?fileId=xxx
export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const fileId = request.nextUrl.searchParams.get("fileId")
  if (!fileId) return NextResponse.json({ chats: [] })

  const chats = db
    .select()
    .from(agentChats)
    .where(and(eq(agentChats.userId, auth.id), eq(agentChats.fileId, fileId)))
    .orderBy(desc(agentChats.updatedAt))
    .all()

  return NextResponse.json({ chats })
}

// POST /api/assistant-chats  { fileId, title, highlightedText?, pageNumber? }
export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { fileId, title } = await request.json()
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 })

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.insert(agentChats).values({
    id,
    userId: auth.id,
    fileId,
    title: title || "New Chat",
    createdAt: now,
    updatedAt: now,
  }).run()

  const chat = db.select().from(agentChats).where(eq(agentChats.id, id)).get()
  return NextResponse.json({ chat })
}

// PATCH /api/assistant-chats  { chatId, title }
export async function PATCH(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { chatId, title } = await request.json()
  if (!chatId || !title) return NextResponse.json({ error: "chatId and title required" }, { status: 400 })

  db.update(agentChats)
    .set({ title, updatedAt: new Date().toISOString() })
    .where(and(eq(agentChats.id, chatId), eq(agentChats.userId, auth.id)))
    .run()

  return NextResponse.json({ success: true })
}

// DELETE /api/assistant-chats?chatId=xxx
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const chatId = request.nextUrl.searchParams.get("chatId")
  if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 })

  db.delete(agentChats)
    .where(and(eq(agentChats.id, chatId), eq(agentChats.userId, auth.id)))
    .run()

  return NextResponse.json({ success: true })
}
