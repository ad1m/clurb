import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { stickyNotes } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const note = db.select().from(stickyNotes).where(eq(stickyNotes.id, id)).get()
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (note.authorId !== auth.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  db.delete(stickyNotes).where(and(eq(stickyNotes.id, id), eq(stickyNotes.authorId, auth.id))).run()

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const updates: Partial<typeof stickyNotes.$inferInsert> = {}
  if (body.positionX !== undefined) updates.positionX = body.positionX
  if (body.positionY !== undefined) updates.positionY = body.positionY
  if (body.color !== undefined) updates.color = body.color

  db.update(stickyNotes)
    .set(updates)
    .where(and(eq(stickyNotes.id, id), eq(stickyNotes.authorId, auth.id)))
    .run()

  return NextResponse.json({ success: true })
}
