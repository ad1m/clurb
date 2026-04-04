import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { files, readingProgress, stickyNotes } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { deleteUploadedFile } from "@/lib/local-storage"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const file = db.select().from(files).where(and(eq(files.id, id), eq(files.ownerId, auth.id))).get()
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const progress = db
    .select()
    .from(readingProgress)
    .where(and(eq(readingProgress.fileId, id), eq(readingProgress.userId, auth.id)))
    .get()

  const notes = db
    .select()
    .from(stickyNotes)
    .where(eq(stickyNotes.fileId, id))
    .all()

  return NextResponse.json({ file: { ...file, progress: progress || null, stickyNotes: notes } })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const file = db.select().from(files).where(and(eq(files.id, id), eq(files.ownerId, auth.id))).get()
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updates: Partial<typeof files.$inferInsert> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.totalPages !== undefined) updates.totalPages = body.totalPages
  if (body.coverImageUrl !== undefined) updates.coverImageUrl = body.coverImageUrl
  updates.updatedAt = new Date().toISOString()

  db.update(files).set(updates).where(eq(files.id, id)).run()

  const updated = db.select().from(files).where(eq(files.id, id)).get()
  return NextResponse.json({ file: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const file = db.select().from(files).where(and(eq(files.id, id), eq(files.ownerId, auth.id))).get()
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 })

  deleteUploadedFile(file.fileUrl)
  db.delete(files).where(eq(files.id, id)).run()

  return NextResponse.json({ success: true })
}
