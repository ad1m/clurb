import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileId, friendId } = await request.json()

    if (!fileId || !friendId) {
      return NextResponse.json({ error: "Missing fileId or friendId" }, { status: 400 })
    }

    // Check if sender owns the file
    const { data: file } = await supabase
      .from("files")
      .select("owner_id")
      .eq("id", fileId)
      .single()

    if (!file || file.owner_id !== user.id) {
      return NextResponse.json({ error: "You don't own this file" }, { status: 403 })
    }

    // Check if invitation already exists
    const { data: existing } = await supabase
      .from("file_invitations")
      .select("id, status")
      .eq("file_id", fileId)
      .eq("invitee_id", friendId)
      .single()

    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json({ error: "Invitation already sent" }, { status: 400 })
      }
      // Update existing declined/accepted invitation to pending
      const { error: updateError } = await supabase
        .from("file_invitations")
        .update({ status: "pending", created_at: new Date().toISOString() })
        .eq("id", existing.id)

      if (updateError) throw updateError

      return NextResponse.json({ success: true, message: "Invitation resent" })
    }

    // Create new invitation
    const { data: invitation, error } = await supabase
      .from("file_invitations")
      .insert({
        file_id: fileId,
        inviter_id: user.id,
        invitee_id: friendId,
        status: "pending",
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: user.id,
      file_id: fileId,
      action_type: "file_shared",
      metadata: { shared_with: friendId },
    })

    return NextResponse.json({ success: true, invitation })
  } catch (error) {
    console.error("[v0] Create invitation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invitation" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get pending invitations for current user
    const { data: invitations, error } = await supabase
      .from("file_invitations")
      .select(`
        *,
        file:files(id, title, cover_image_url),
        inviter:profiles!file_invitations_inviter_id_fkey(id, username, display_name)
      `)
      .eq("invitee_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error("[v0] Get invitations error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invitations" },
      { status: 500 }
    )
  }
}
