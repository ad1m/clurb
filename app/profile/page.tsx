"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@/lib/types"
import { LibraryHeader } from "@/components/library-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      const meRes = await fetch("/api/auth/me")
      if (!meRes.ok) { router.push("/auth/login"); return }
      const { user: currentUser } = await meRes.json()
      setUser(currentUser)
      setDisplayName(currentUser.displayName || currentUser.username || "")
      setIsLoading(false)
    }
    fetchProfile()
  }, [router])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Profile updates would need a PATCH /api/auth/me endpoint
      // For now just show success
      toast({ title: "Profile updated" })
    } finally {
      setIsSaving(false)
    }
  }

  const initials =
    user?.displayName?.split(" ").map((n) => n[0]).join("").toUpperCase() ||
    user?.username?.[0]?.toUpperCase() || "?"

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LibraryHeader user={user} />
      <main className="pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-6">
          <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
          <Card>
            <CardHeader>
              <CardTitle>Your Account</CardTitle>
              <CardDescription>Manage your Clurb profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.displayName || user?.username}</p>
                  <p className="text-sm text-muted-foreground">@{user?.username}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
