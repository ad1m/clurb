import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { pageAnnotations } from "@/db/schema"
import { eq, and } from "drizzle-orm"

// GET /api/annotations?fileId=xxx&pageNumber=xxx
export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const fileId = request.nextUrl.searchParams.get("fileId")
  const pageNumber = Number(request.nextUrl.searchParams.get("pageNumber"))
  if (!fileId || !pageNumber) return NextResponse.json({ error: "fileId and pageNumber required" }, { status: 400 })

  const record = db
    .select()
    .from(pageAnnotations)
    .where(and(eq(pageAnnotations.fileId, fileId), eq(pageAnnotations.userId, auth.id), eq(pageAnnotations.pageNumber, pageNumber)))
    .get()

  return NextResponse.json({ data: record ? JSON.parse(record.data) : null })
}

// PUT /api/annotations  { fileId, pageNumber, data }
export async function PUT(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { fileId, pageNumber, data } = await request.json()
  if (!fileId || !pageNumber) return NextResponse.json({ error: "fileId and pageNumber required" }, { status: 400 })

  const existing = db
    .select({ id: pageAnnotations.id })
    .from(pageAnnotations)
    .where(and(eq(pageAnnotations.fileId, fileId), eq(pageAnnotations.userId, auth.id), eq(pageAnnotations.pageNumber, pageNumber)))
    .get()

  const now = new Date().toISOString()
  const dataStr = JSON.stringify(data ?? {})

  if (existing) {
    db.update(pageAnnotations)
      .set({ data: dataStr, updatedAt: now })
      .where(eq(pageAnnotations.id, existing.id))
      .run()
  } else {
    db.insert(pageAnnotations).values({
      id: crypto.randomUUID(),
      fileId,
      userId: auth.id,
      pageNumber,
      data: dataStr,
      updatedAt: now,
    }).run()
  }

  return NextResponse.json({ success: true })
}
