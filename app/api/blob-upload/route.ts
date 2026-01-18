import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

export async function POST(request: Request): Promise<NextResponse> {
  console.log("[v0] Blob upload POST received")
  
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error("[v0] Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.error("[v0] No file in FormData")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] Uploading file:", file.name, "size:", file.size, "type:", file.type)

    // Upload to Vercel Blob
    const blob = await put(`clurb/${user.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

    console.log("[v0] Upload successful:", blob.url)

    return NextResponse.json({ 
      success: true, 
      url: blob.url
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}
