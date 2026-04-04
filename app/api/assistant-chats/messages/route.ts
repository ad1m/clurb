import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { agentChats, agentMessages } from "@/db/schema"
import { eq, and, asc } from "drizzle-orm"

// GET /api/assistant-chats/messages?chatId=xxx
export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const chatId = request.nextUrl.searchParams.get("chatId")
  if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 })

  // Verify ownership
  const chat = db.select().from(agentChats).where(and(eq(agentChats.id, chatId), eq(agentChats.userId, auth.id))).get()
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const messages = db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.chatId, chatId))
    .orderBy(asc(agentMessages.createdAt))
    .all()

  return NextResponse.json({ messages })
}

// POST /api/assistant-chats/messages  { chatId, messages: [{role, content}] }
export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { chatId, messages } = await request.json()
  if (!chatId || !messages?.length) return NextResponse.json({ error: "chatId and messages required" }, { status: 400 })

  // Verify ownership
  const chat = db.select().from(agentChats).where(and(eq(agentChats.id, chatId), eq(agentChats.userId, auth.id))).get()
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 })

  for (const msg of messages) {
    db.insert(agentMessages).values({
      id: crypto.randomUUID(),
      chatId,
      role: msg.role,
      content: msg.content,
    }).run()
  }

  // Update chat's updatedAt
  db.update(agentChats).set({ updatedAt: new Date().toISOString() }).where(eq(agentChats.id, chatId)).run()

  return NextResponse.json({ success: true })
}
