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

    console.log(`[v0] Processing invitation ${invitationId} action: ${action} for user: ${user.id}`)

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("file_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("to_user_id", user.id)
      .single()

    if (inviteError) {
      console.error("[v0] Error fetching invitation:", inviteError)
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    if (!invitation) {
      console.error("[v0] Invitation not found or user not recipient")
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    console.log("[v0] Found invitation:", invitation)

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation already responded to" }, { status: 400 })
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from("file_invitations")
      .update({ 
        status: action === "accept" ? "accepted" : "declined",
        responded_at: new Date().toISOString()
      })
      .eq("id", invitationId)

    if (updateError) {
      console.error("[v0] Error updating invitation:", updateError)
      throw updateError
    }

    console.log("[v0] Updated invitation status")

    // If accepted, add user as file member
    if (action === "accept") {
      console.log("[v0] Adding user to file_members")
      
      // First check if user is already a member
      const { data: existingMember } = await supabase
        .from("file_members")
        .select("id")
        .eq("file_id", invitation.file_id)
        .eq("user_id", user.id)
        .single()

      if (existingMember) {
        console.log("[v0] User already a member")
      } else {
        const { error: memberError } = await supabase
          .from("file_members")
          .insert({
            file_id: invitation.file_id,
            user_id: user.id,
            role: "viewer",
          })

        if (memberError) {
          console.error("[v0] Error adding to file_members:", memberError)
          throw memberError
        }

        console.log("[v0] Added user to file_members")
      }

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: user.id,
        file_id: invitation.file_id,
        action_type: "file_joined",
      })

      console.log("[v0] Logged activity")
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
