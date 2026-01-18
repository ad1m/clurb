"use client"

import { useEffect, useState } from "react"
import { Check, X, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface Invitation {
  id: string
  file_id: string
  created_at: string
  file: {
    id: string
    title: string
    cover_image_url: string | null
  } | null
  inviter: {
    id: string
    username: string
    display_name: string | null
  } | null
}

export function InvitationsPanel() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/invitations")
      if (!response.ok) throw new Error("Failed to fetch invitations")
      const data = await response.json()
      // Filter out invitations where file or inviter is null (deleted files/users)
      const validInvitations = (data.invitations || []).filter(
        (inv: Invitation) => inv.file && inv.inviter
      )
      setInvitations(validInvitations)
    } catch (error) {
      console.error("[v0] Fetch invitations error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [])

  const handleResponse = async (invitationId: string, action: "accept" | "decline") => {
    setProcessingIds(prev => new Set(prev).add(invitationId))

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      toast({
        title: action === "accept" ? "Invitation accepted" : "Invitation declined",
        description: data.message,
      })

      // Remove from list and refresh to update count
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      
      // Refresh the page to update library if accepted
      if (action === "accept") {
        // Delay slightly to allow database to update
        setTimeout(() => {
          window.location.reload()
        }, 500)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to respond to invitation",
        variant: "destructive",
      })
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(invitationId)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p className="text-sm">No pending invitations</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {invitations.map((invitation) => {
        const isProcessing = processingIds.has(invitation.id)
        // These should always exist due to filtering, but add safety checks
        const file = invitation.file
        const inviter = invitation.inviter
        
        if (!file || !inviter) return null

        return (
          <Card key={invitation.id} className="p-4">
            <div className="flex gap-4">
              {/* File cover */}
              <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-muted">
                {file.cover_image_url ? (
                  <img
                    src={file.cover_image_url}
                    alt={file.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shared by {inviter.display_name || inviter.username}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(invitation.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 items-start">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleResponse(invitation.id, "accept")}
                  disabled={isProcessing}
                  className="h-8 w-8 p-0"
                  title="Accept invitation"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResponse(invitation.id, "decline")}
                  disabled={isProcessing}
                  className="h-8 w-8 p-0"
                  title="Decline invitation"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
