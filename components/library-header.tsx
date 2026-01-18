"use client"

import Link from "next/link"
import { BookOpen, Moon, Sun, MessageSquare, Sparkles, LogOut, User, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UploadDialog } from "./upload-dialog"
import { useTheme } from "next-themes"
import type { Profile } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { InvitationsPanel } from "./invitations-panel"
import { useState, useEffect } from "react"

interface LibraryHeaderProps {
  profile: Profile | null
  onUploadComplete?: () => void
}

export function LibraryHeader({ profile, onUploadComplete }: LibraryHeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [invitationCount, setInvitationCount] = useState(0)
  const [friendRequestCount, setFriendRequestCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchInvitationCount = async () => {
      try {
        const response = await fetch("/api/invitations")
        if (response.ok) {
          const data = await response.json()
          setInvitationCount(data.invitations?.length || 0)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch invitation count:", error)
      }
    }

    fetchInvitationCount()
    const interval = setInterval(fetchInvitationCount, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchFriendRequestCount = async () => {
      if (!profile) return

      try {
        const { data } = await supabase
          .from("friendships")
          .select("id")
          .eq("friend_id", profile.id)
          .eq("status", "pending")

        setFriendRequestCount(data?.length || 0)
      } catch (error) {
        console.error("[v0] Failed to fetch friend request count:", error)
      }
    }

    fetchFriendRequestCount()
    const interval = setInterval(fetchFriendRequestCount, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [profile, supabase])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const initials =
    profile?.display_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    profile?.username?.[0]?.toUpperCase() ||
    "?"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/library" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Clurb</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/library">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Library
              </Button>
            </Link>
            <Link href="/friends">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground relative">
                Friends
                {friendRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                    {friendRequestCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/agent">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                <Sparkles className="w-4 h-4" />
                AI Agent
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground"
          >
            <Sun className="w-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute w-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <UploadDialog onUploadComplete={onUploadComplete} />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                <Bell className="w-5 h-5" />
                {invitationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                    {invitationCount}
                  </span>
                )}
                <span className="sr-only">File invitations</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-sm">File Invitations</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <InvitationsPanel />
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.display_name || profile?.username}</p>
                <p className="text-xs text-muted-foreground">@{profile?.username}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/agent" className="cursor-pointer">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  AI Agent
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
