import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// This route handles saving file metadata to DB after client-side blob upload
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { blobUrl, title, fileName, fileType } = body

    if (!blobUrl || !fileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create file record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert({
        owner_id: user.id,
        title: title || fileName.replace(/\.[^/.]+$/, ""),
        file_url: blobUrl,
        file_type: fileType || "application/pdf",
        total_pages: 0,
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({ error: "Failed to save file record: " + dbError.message }, { status: 500 })
    }

    // Add owner as file member
    const { error: memberError } = await supabase.from("file_members").insert({
      file_id: fileRecord.id,
      user_id: user.id,
      role: "owner",
    })

    if (memberError) {
      console.error("[v0] Member error:", memberError)
    }

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: user.id,
      file_id: fileRecord.id,
      action_type: "file_uploaded",
      metadata: { title: fileRecord.title, file_type: fileType },
    })

    return NextResponse.json({ success: true, file: fileRecord })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}

// Direct blob upload endpoint for smaller files (backup)
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`clurb/${user.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    return NextResponse.json({ success: true, url: blob.url })
  } catch (error) {
    console.error("[v0] Blob upload error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}
