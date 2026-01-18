"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Profile } from "@/lib/types"
import { LibraryHeader } from "@/components/library-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (profileData) {
        setProfile(profileData)
        setDisplayName(profileData.display_name || "")
        setUsername(profileData.username)
      }

      setIsLoading(false)
    }

    fetchProfile()
  }, [supabase, router])

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          username: username.toLowerCase().replace(/\s/g, ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      setProfile((prev) => (prev ? { ...prev, display_name: displayName, username } : null))
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      })
    } catch {
      toast({
        title: "Failed to update profile",
        description: "There was an error saving your changes.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const initials =
    profile?.display_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    profile?.username?.[0]?.toUpperCase() ||
    "?"

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
        <div className="max-w-lg mx-auto px-6">
          <h1 className="text-2xl font-bold mb-6">Profile</h1>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{profile?.display_name || profile?.username}</CardTitle>
                  <CardDescription>@{profile?.username}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="your_username"
                />
                <p className="text-xs text-muted-foreground">
                  This is how friends can find and tag you. Letters, numbers, and underscores only.
                </p>
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
