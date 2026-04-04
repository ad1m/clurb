import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { saveFile } from "@/lib/local-storage"
import { db } from "@/db"
import { files, activityLog } from "@/db/schema"
import { eq } from "drizzle-orm"
import { extractText } from "unpdf"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = formData.get("title") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const allowedTypes = ["application/pdf", "text/plain"]
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
      return NextResponse.json({ error: "Only PDF and TXT files are supported" }, { status: 400 })
    }

    const MAX_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size must be under 50MB" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileUrl = await saveFile(auth.id, file.name, buffer)

    // Extract page count for PDFs
    let totalPages = 0
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const { totalPages: pages } = await extractText(buffer.buffer as ArrayBuffer, { mergePages: true })
        totalPages = pages
      } catch (e) {
        console.warn("[upload] Could not extract page count:", e)
      }
    }

    const fileTitle = title || file.name.replace(/\.[^/.]+$/, "")
    const id = crypto.randomUUID()

    db.insert(files).values({
      id,
      ownerId: auth.id,
      title: fileTitle,
      fileUrl,
      fileType: file.type || "application/pdf",
      totalPages,
    }).run()

    // Log activity
    db.insert(activityLog).values({
      id: crypto.randomUUID(),
      userId: auth.id,
      fileId: id,
      actionType: "file_uploaded",
      metadata: JSON.stringify({ title: fileTitle, fileType: file.type }),
    }).run()

    const fileRecord = db.select().from(files).where(eq(files.id, id)).get()

    return NextResponse.json({ success: true, file: fileRecord })
  } catch (error) {
    console.error("[upload]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}
