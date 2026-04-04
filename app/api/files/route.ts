import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { files, readingProgress } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userFiles = db
      .select()
      .from(files)
      .where(eq(files.ownerId, auth.id))
      .orderBy(desc(files.updatedAt))
      .all()

    // Get reading progress for all files
    const progress = db
      .select()
      .from(readingProgress)
      .where(eq(readingProgress.userId, auth.id))
      .all()

    const progressMap = new Map(progress.map((p) => [p.fileId, p]))

    const filesWithProgress = userFiles.map((f) => ({
      ...f,
      progress: progressMap.get(f.id) || null,
    }))

    return NextResponse.json({ files: filesWithProgress })
  } catch (error) {
    console.error("[files GET]", error)
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}
