import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getAuthUser } from "@/lib/auth"

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads")

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
  ".txt": "text/plain; charset=utf-8",
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filePath: string[] }> }
) {
  const auth = await getAuthUser()
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { filePath } = await params
  // Prevent path traversal
  const resolved = path.resolve(UPLOADS_DIR, ...filePath)
  if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  if (!fs.existsSync(resolved)) {
    return new NextResponse("Not Found", { status: 404 })
  }

  const ext = path.extname(resolved).toLowerCase()
  const contentType = MIME_TYPES[ext] || "application/octet-stream"
  const fileBuffer = fs.readFileSync(resolved)

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(fileBuffer.length),
    },
  })
}
