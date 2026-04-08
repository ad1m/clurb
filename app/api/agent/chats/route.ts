import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { agentChats } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "100"))
  const offset = (page - 1) * limit

  const all = db
    .select()
    .from(agentChats)
    .where(eq(agentChats.userId, auth.id))
    .orderBy(desc(agentChats.updatedAt))
    .all()

  const total = all.length
  const chats = all.slice(offset, offset + limit)

  return NextResponse.json({ chats, total, page, limit, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.insert(agentChats).values({
    id,
    userId: auth.id,
    title: body.title || "New Chat",
    createdAt: now,
    updatedAt: now,
  }).run()

  const chat = db.select().from(agentChats).where(eq(agentChats.id, id)).get()
  return NextResponse.json(chat)
}
