import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { del } from "@vercel/blob"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Check if user owns the file
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single()

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 })
    }

    // Update file title
    const { error: updateError } = await supabase
      .from("files")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) {
      console.error("[v0] Error updating file:", updateError)
      return NextResponse.json({ error: "Failed to update file" }, { status: 500 })
    }

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: user.id,
      file_id: id,
      action_type: "file_renamed",
      metadata: { old_title: file.title, new_title: title },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update file error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if user owns the file
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single()

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 })
    }

    // Delete from Vercel Blob
    try {
      await del(file.file_url)
    } catch (blobError) {
      console.error("[v0] Error deleting from blob:", blobError)
      // Continue even if blob deletion fails
    }

    // Delete file record (cascading deletes will handle related records)
    const { error: deleteError } = await supabase
      .from("files")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[v0] Error deleting file:", deleteError)
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete file error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    )
  }
}
