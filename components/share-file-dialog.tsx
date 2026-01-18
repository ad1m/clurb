"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Share2, Search, Loader2, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

interface ShareFileDialogProps {
  fileId: string
  fileName: string
}

export function ShareFileDialog({ fileId, fileName }: ShareFileDialogProps) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchFriends()
    }
  }, [open])

  const fetchFriends = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get accepted friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("*, friend:profiles!friendships_friend_id_fkey(*)")
        .eq("user_id", user.id)
        .eq("status", "accepted")

      const friendProfiles = friendships?.map((f: any) => f.friend) || []
      setFriends(friendProfiles)
    } catch (error) {
      console.error("[v0] Error fetching friends:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!selectedFriend) return

    setIsSending(true)
    try {
      const response = await fetch("/api/files/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          toUserId: selectedFriend.id,
          message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to send invitation")
      }

      toast({
        title: "Invitation sent",
        description: `${selectedFriend.display_name} has been invited to read "${fileName}"`,
      })

      setOpen(false)
      setSelectedFriend(null)
      setMessage("")
    } catch (error) {
      console.error("[v0] Error sending invitation:", error)
      toast({
        title: "Failed to send invitation",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const filteredFriends = friends.filter((friend) =>
    friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share with Friends</DialogTitle>
          <DialogDescription>
            Invite friends to read "{fileName}" with you
          </DialogDescription>
        </DialogHeader>

        {!selectedFriend ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {friends.length === 0 ? "You don't have any friends yet" : "No friends found"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{friend.display_name?.[0] || friend.username?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{friend.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarFallback>{selectedFriend.display_name?.[0] || selectedFriend.username?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFriend.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{selectedFriend.username}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFriend(null)}
              >
                Change
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={handleSendInvitation} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
