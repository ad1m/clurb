import fs from "fs"
import path from "path"
import { extractText } from "unpdf"

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads")

function ensureUserDir(userId: string): string {
  const dir = path.join(UPLOADS_DIR, userId)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function saveFile(
  userId: string,
  originalName: string,
  buffer: Buffer
): Promise<string> {
  const dir = ensureUserDir(userId)
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filename = `${Date.now()}-${safe}`
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, buffer)
  // Return the URL path used to serve the file
  return `/api/files/serve/${userId}/${filename}`
}

export function resolveFilePath(fileUrl: string): string {
  // fileUrl format: /api/files/serve/<userId>/<filename>
  const parts = fileUrl.replace("/api/files/serve/", "").split("/")
  return path.join(UPLOADS_DIR, ...parts)
}

export async function extractPdfPages(fileUrl: string, startPage: number, endPage: number): Promise<string> {
  const filePath = resolveFilePath(fileUrl)
  if (!fs.existsSync(filePath)) throw new Error("File not found on disk")

  const buffer = fs.readFileSync(filePath)
  const { text, totalPages } = await extractText(buffer.buffer as ArrayBuffer, { mergePages: false })

  const s = Math.max(1, Math.min(startPage, totalPages))
  const e = Math.max(s, Math.min(endPage, totalPages))

  const parts: string[] = []
  for (let p = s; p <= e; p++) {
    const pageText = text[p - 1]
    if (pageText?.trim()) parts.push(`--- Page ${p} ---\n${pageText}`)
  }
  if (parts.length === 0) throw new Error(`No text found in pages ${startPage}–${endPage}`)
  return parts.join("\n\n")
}

export function deleteUploadedFile(fileUrl: string): void {
  try {
    const filePath = resolveFilePath(fileUrl)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    console.error("[local-storage] delete error:", err)
  }
}
