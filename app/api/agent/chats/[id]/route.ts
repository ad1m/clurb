import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { agentChats, agentMessages } from "@/db/schema"
import { eq, and, asc } from "drizzle-orm"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const chat = db.select().from(agentChats).where(and(eq(agentChats.id, id), eq(agentChats.userId, auth.id))).get()
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })

  const messages = db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.chatId, id))
    .orderBy(asc(agentMessages.createdAt))
    .all()

  return NextResponse.json({ ...chat, messages })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { title } = await req.json()
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })

  db.update(agentChats)
    .set({ title, updatedAt: new Date().toISOString() })
    .where(and(eq(agentChats.id, id), eq(agentChats.userId, auth.id)))
    .run()

  const chat = db.select().from(agentChats).where(eq(agentChats.id, id)).get()
  return NextResponse.json(chat)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  db.delete(agentChats).where(and(eq(agentChats.id, id), eq(agentChats.userId, auth.id))).run()
  return NextResponse.json({ success: true })
}
