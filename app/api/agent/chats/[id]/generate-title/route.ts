import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { agentChats, agentMessages } from "@/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: chatId } = await params

  const chat = db.select().from(agentChats).where(and(eq(agentChats.id, chatId), eq(agentChats.userId, auth.id))).get()
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })

  const firstUserMsg = db
    .select({ content: agentMessages.content })
    .from(agentMessages)
    .where(and(eq(agentMessages.chatId, chatId), eq(agentMessages.role, "user")))
    .orderBy(asc(agentMessages.createdAt))
    .limit(1)
    .get()

  if (!firstUserMsg) return NextResponse.json({ error: "No messages yet" }, { status: 400 })

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Create a 2-3 word title for this reading assistant question: "${firstUserMsg.content}"\n\nRules: maximum 3 words, no punctuation, no quotes, title case. Output only the title.`,
    maxTokens: 15,
  })

  const title = text.trim().replace(/^["']|["']$/g, "").replace(/[.!?]$/, "").slice(0, 40)
  db.update(agentChats).set({ title, updatedAt: new Date().toISOString() }).where(eq(agentChats.id, chatId)).run()

  const updated = db.select().from(agentChats).where(eq(agentChats.id, chatId)).get()
  return NextResponse.json(updated)
}
