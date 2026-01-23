"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, UserPlus, Check, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface InviteFriendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileId: string
  existingMemberIds: string[]
  onInviteComplete?: () => void
}

export function InviteFriendDialog({
  open,
  onOpenChange,
  fileId,
  existingMemberIds,
  onInviteComplete,
}: InviteFriendDialogProps) {
  const [search, setSearch] = useState("")
  const [friends, setFriends] = useState<Profile[]>([])
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set())
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchFriends()
    }
  }, [open])

  const fetchFriends = async () => {
    setIsLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Get accepted friendships
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id, friend_id")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq("status", "accepted")

    if (!friendships || friendships.length === 0) {
      setFriends([])
      setIsLoading(false)
      return
    }

    // Get friend IDs
    const friendIds = friendships.map((f) => (f.user_id === user.id ? f.friend_id : f.user_id))

    // Fetch friend profiles
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", friendIds)

    setFriends(profiles || [])
    setIsLoading(false)
  }

  const handleInvite = async (friendId: string) => {
    setInvitingIds((prev) => new Set(prev).add(friendId))

    try {
      // Use the invitations API to create a proper invitation
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          friendId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation")
      }

      setInvitedIds((prev) => new Set(prev).add(friendId))
      toast({
        title: "Invitation sent",
        description: "Your friend will receive a notification to join this document.",
      })
      onInviteComplete?.()
    } catch (error) {
      toast({
        title: "Failed to invite",
        description: error instanceof Error ? error.message : "There was an error inviting your friend.",
        variant: "destructive",
      })
    } finally {
      setInvitingIds((prev) => {
        const next = new Set(prev)
        next.delete(friendId)
        return next
      })
    }
  }

  const filteredFriends = friends.filter(
    (friend) =>
      !existingMemberIds.includes(friend.id) &&
      (friend.username.toLowerCase().includes(search.toLowerCase()) ||
        friend.display_name?.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>Share this document with friends so you can read together.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-muted-foreground">
                {friends.length === 0
                  ? "You haven't added any friends yet"
                  : search
                    ? "No friends match your search"
                    : "All your friends already have access"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((friend) => {
                const isInviting = invitingIds.has(friend.id)
                const isInvited = invitedIds.has(friend.id)
                const initials =
                  friend.display_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() ||
                  friend.username?.[0]?.toUpperCase() ||
                  "?"

                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{friend.display_name || friend.username}</p>
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isInvited ? "secondary" : "default"}
                      disabled={isInviting || isInvited}
                      onClick={() => handleInvite(friend.id)}
                    >
                      {isInviting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isInvited ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Invited
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Invite
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
