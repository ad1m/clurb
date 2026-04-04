import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { stickyNotes, activityLog } from "@/db/schema"
import { eq } from "drizzle-orm"

// GET /api/sticky-notes?fileId=xxx
export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const fileId = request.nextUrl.searchParams.get("fileId")
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 })

  const notes = db
    .select()
    .from(stickyNotes)
    .where(eq(stickyNotes.fileId, fileId))
    .all()

  return NextResponse.json({ stickyNotes: notes })
}

// POST /api/sticky-notes  { fileId, pageNumber, content, positionX, positionY, color }
export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { fileId, pageNumber, content, positionX, positionY, color } = await request.json()

  if (!fileId || !pageNumber || !content) {
    return NextResponse.json({ error: "fileId, pageNumber, and content are required" }, { status: 400 })
  }

  const id = crypto.randomUUID()
  db.insert(stickyNotes).values({
    id,
    fileId,
    authorId: auth.id,
    pageNumber,
    content,
    positionX: positionX ?? 100,
    positionY: positionY ?? 100,
    color: color ?? "yellow",
  }).run()

  // Log activity
  db.insert(activityLog).values({
    id: crypto.randomUUID(),
    userId: auth.id,
    fileId,
    actionType: "sticky_note_created",
    metadata: JSON.stringify({ page: pageNumber, preview: content.substring(0, 50) }),
  }).run()

  const note = db.select().from(stickyNotes).where(eq(stickyNotes.id, id)).get()
  return NextResponse.json({ stickyNote: note })
}
