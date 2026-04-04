import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { readingProgress, activityLog, files } from "@/db/schema"
import { eq, and } from "drizzle-orm"

// GET /api/reading-progress?fileId=xxx
export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const fileId = request.nextUrl.searchParams.get("fileId")
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 })

  const progress = db
    .select()
    .from(readingProgress)
    .where(and(eq(readingProgress.fileId, fileId), eq(readingProgress.userId, auth.id)))
    .get()

  return NextResponse.json({ progress: progress || null })
}

// POST /api/reading-progress  { fileId, currentPage }
export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { fileId, currentPage } = await request.json()
  if (!fileId || currentPage === undefined) {
    return NextResponse.json({ error: "fileId and currentPage required" }, { status: 400 })
  }

  // Verify file exists and belongs to user
  const file = db.select().from(files).where(eq(files.id, fileId)).get()
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 })

  const existing = db
    .select()
    .from(readingProgress)
    .where(and(eq(readingProgress.fileId, fileId), eq(readingProgress.userId, auth.id)))
    .get()

  const now = new Date().toISOString()

  if (existing) {
    db.update(readingProgress)
      .set({ currentPage, lastReadAt: now })
      .where(and(eq(readingProgress.fileId, fileId), eq(readingProgress.userId, auth.id)))
      .run()
  } else {
    db.insert(readingProgress).values({
      id: crypto.randomUUID(),
      fileId,
      userId: auth.id,
      currentPage,
      lastReadAt: now,
    }).run()
  }

  // Log page view activity
  db.insert(activityLog).values({
    id: crypto.randomUUID(),
    userId: auth.id,
    fileId,
    actionType: "page_viewed",
    metadata: JSON.stringify({ page: currentPage, title: file.title }),
  }).run()

  // Update file's updatedAt
  db.update(files)
    .set({ updatedAt: now })
    .where(eq(files.id, fileId))
    .run()

  return NextResponse.json({ success: true })
}
