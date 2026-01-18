import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: invitationId } = await params
    const { action } = await request.json()

    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("file_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("to_user_id", user.id)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation already responded to" }, { status: 400 })
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from("file_invitations")
      .update({ status: action === "accept" ? "accepted" : "declined" })
      .eq("id", invitationId)

    if (updateError) throw updateError

    // If accepted, add user as file member
    if (action === "accept") {
      const { error: memberError } = await supabase
        .from("file_members")
        .insert({
          file_id: invitation.file_id,
          user_id: user.id,
          role: "viewer",
        })

      if (memberError) {
        // If already a member, that's ok
        if (!memberError.message.includes("duplicate")) {
          throw memberError
        }
      }

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: user.id,
        file_id: invitation.file_id,
        action_type: "file_joined",
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: action === "accept" ? "File added to your library" : "Invitation declined" 
    })
  } catch (error) {
    console.error("[v0] Respond to invitation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to respond to invitation" },
      { status: 500 }
    )
  }
}
