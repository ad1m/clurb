"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Profile, Friendship } from "@/lib/types"
import { LibraryHeader } from "@/components/library-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, UserPlus, Check, X, Loader2, Users, UserCheck, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function FriendsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [friends, setFriends] = useState<(Friendship & { user?: Profile; friend?: Profile })[]>([])
  const [pendingReceived, setPendingReceived] = useState<(Friendship & { user?: Profile })[]>([])
  const [pendingSent, setPendingSent] = useState<(Friendship & { friend?: Profile })[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    // Fetch profile
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    setProfile(profileData)

    // Fetch accepted friendships
    const { data: acceptedFriends } = await supabase
      .from("friendships")
      .select(`
        *,
        user:profiles!friendships_user_id_fkey(*),
        friend:profiles!friendships_friend_id_fkey(*)
      `)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq("status", "accepted")

    setFriends(acceptedFriends || [])

    // Fetch pending received requests
    const { data: pendingReceivedData } = await supabase
      .from("friendships")
      .select(`
        *,
        user:profiles!friendships_user_id_fkey(*)
      `)
      .eq("friend_id", user.id)
      .eq("status", "pending")

    setPendingReceived(pendingReceivedData || [])

    // Fetch pending sent requests
    const { data: pendingSentData } = await supabase
      .from("friendships")
      .select(`
        *,
        friend:profiles!friendships_friend_id_fkey(*)
      `)
      .eq("user_id", user.id)
      .eq("status", "pending")

    setPendingSent(pendingSentData || [])

    setIsLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !profile) return

    setIsSearching(true)
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .neq("id", profile.id)
      .limit(10)

    setSearchResults(data || [])
    setIsSearching(false)
  }

  const handleSendRequest = async (friendId: string) => {
    if (!profile) return

    setActionLoading(friendId)
    try {
      const { error } = await supabase.from("friendships").insert({
        user_id: profile.id,
        friend_id: friendId,
        status: "pending",
      })

      if (error) throw error

      toast({
        title: "Friend request sent",
        description: "They will be notified of your request.",
      })

      // Refresh data
      fetchData()
      setSearchResults((prev) => prev.filter((p) => p.id !== friendId))
    } catch {
      toast({
        title: "Failed to send request",
        description: "There was an error sending your friend request.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleAcceptRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId)

      if (error) throw error

      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      })

      fetchData()
    } catch {
      toast({
        title: "Failed to accept request",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeclineRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      const { error } = await supabase.from("friendships").update({ status: "declined" }).eq("id", friendshipId)

      if (error) throw error

      toast({ title: "Friend request declined" })
      fetchData()
    } catch {
      toast({
        title: "Failed to decline request",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getInitials = (p: Profile | undefined) =>
    p?.display_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    p?.username?.[0]?.toUpperCase() ||
    "?"

  // Check if user is already a friend or has pending request
  const getRelationshipStatus = (userId: string) => {
    if (friends.some((f) => f.user_id === userId || f.friend_id === userId)) return "friend"
    if (pendingSent.some((p) => p.friend_id === userId)) return "pending_sent"
    if (pendingReceived.some((p) => p.user_id === userId)) return "pending_received"
    return "none"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LibraryHeader profile={profile} />

      <main className="pt-20 pb-12">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-2xl font-bold mb-6">Friends</h1>

          {/* Search Section */}
          <Card className="mb-8">
            <CardContent className="p-4">
              <h2 className="font-medium mb-3">Find Friends</h2>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map((user) => {
                    const status = getRelationshipStatus(user.id)
                    return (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.display_name || user.username}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                        {status === "none" && (
                          <Button
                            size="sm"
                            onClick={() => handleSendRequest(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        )}
                        {status === "friend" && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <UserCheck className="w-4 h-4" /> Friends
                          </span>
                        )}
                        {status === "pending_sent" && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Pending
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="friends">
            <TabsList className="mb-4">
              <TabsTrigger value="friends" className="gap-2">
                <Users className="w-4 h-4" />
                Friends ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Requests ({pendingReceived.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-2">
                <Clock className="w-4 h-4" />
                Sent ({pendingSent.length})
              </TabsTrigger>
            </TabsList>

            {/* Friends List */}
            <TabsContent value="friends">
              {friends.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">No friends yet</h3>
                    <p className="text-sm text-muted-foreground">Search for friends to start reading together!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {friends.map((friendship) => {
                    const friend = friendship.user_id === profile?.id ? friendship.friend : friendship.user
                    return (
                      <Card key={friendship.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={friend?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(friend)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{friend?.display_name || friend?.username}</p>
                              <p className="text-sm text-muted-foreground">@{friend?.username}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Pending Requests */}
            <TabsContent value="requests">
              {pendingReceived.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">No pending requests</h3>
                    <p className="text-sm text-muted-foreground">Friend requests you receive will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {pendingReceived.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={request.user?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(request.user)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{request.user?.display_name || request.user?.username}</p>
                            <p className="text-sm text-muted-foreground">@{request.user?.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="bg-transparent"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={actionLoading === request.id}
                          >
                            {actionLoading === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Accept
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Sent Requests */}
            <TabsContent value="sent">
              {pendingSent.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">No sent requests</h3>
                    <p className="text-sm text-muted-foreground">Friend requests you send will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {pendingSent.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={request.friend?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(request.friend)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{request.friend?.display_name || request.friend?.username}</p>
                            <p className="text-sm text-muted-foreground">@{request.friend?.username}</p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">Pending</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
