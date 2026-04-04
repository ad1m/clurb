import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { agentChats, agentMessages } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: chatId } = await params

  const chat = db.select().from(agentChats).where(and(eq(agentChats.id, chatId), eq(agentChats.userId, auth.id))).get()
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })

  const { role, content } = await req.json()
  if (!role || !content) return NextResponse.json({ error: "Role and content required" }, { status: 400 })

  const id = crypto.randomUUID()
  db.insert(agentMessages).values({ id, chatId, role, content }).run()

  // Update chat's updatedAt
  db.update(agentChats).set({ updatedAt: new Date().toISOString() }).where(eq(agentChats.id, chatId)).run()

  const message = db.select().from(agentMessages).where(eq(agentMessages.id, id)).get()
  return NextResponse.json(message)
}
