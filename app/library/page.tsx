"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { File, Profile } from "@/lib/types"
import { LibraryHeader } from "@/components/library-header"
import { LibraryGrid } from "@/components/library-grid"
import { FilterDropdown } from "@/components/filter-dropdown"
import { Loader2 } from "lucide-react"

const FILTER_OPTIONS = [
  { label: "all", value: "all" },
  { label: "my uploads", value: "owned" },
  { label: "shared with me", value: "shared" },
  { label: "recently read", value: "recent" },
]

export default function LibraryPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [filter, setFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    // Fetch or create profile
    let { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (!profileData) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username: user.user_metadata?.username || user.email?.split("@")[0] || "user",
          display_name: user.user_metadata?.display_name || user.user_metadata?.username || null,
        })
        .select()
        .single()
      profileData = newProfile
    }

    setProfile(profileData)

    // Get all file IDs where user is a member (includes owner)
    const { data: memberFileIds } = await supabase
      .from("file_members")
      .select("file_id")
      .eq("user_id", user.id)

    const allFileIds = memberFileIds?.map((m) => m.file_id) || []

    // Fetch files based on filter
    let filesData: any[] = []

    if (filter === "owned") {
      const { data } = await supabase
        .from("files")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
      filesData = data || []
    } else if (filter === "shared") {
      // Get files where user is a member but not owner
      const { data: sharedMemberFiles } = await supabase
        .from("file_members")
        .select("file_id")
        .eq("user_id", user.id)
        .neq("role", "owner")

      const sharedFileIds = sharedMemberFiles?.map((m) => m.file_id) || []
      if (sharedFileIds.length > 0) {
        const { data } = await supabase
          .from("files")
          .select("*")
          .in("id", sharedFileIds)
          .order("updated_at", { ascending: false })
        filesData = data || []
      }
    } else if (filter === "recent") {
      const { data: recentProgress } = await supabase
        .from("reading_progress")
        .select("file_id")
        .eq("user_id", user.id)
        .order("last_read_at", { ascending: false })
        .limit(20)

      const recentFileIds = recentProgress?.map((p) => p.file_id) || []
      if (recentFileIds.length > 0) {
        const { data } = await supabase
          .from("files")
          .select("*")
          .in("id", recentFileIds)
          .order("updated_at", { ascending: false })
        filesData = data || []
      }
    } else {
      // All files - owned or member of
      if (allFileIds.length > 0) {
        const { data } = await supabase
          .from("files")
          .select("*")
          .in("id", allFileIds)
          .order("updated_at", { ascending: false })
        filesData = data || []
      }
    }

    // Get user's reading progress for each file
    const fileIds = filesData.map((f) => f.id)
    let progressMap: Record<string, any> = {}
    
    if (fileIds.length > 0) {
      const { data: progressData } = await supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("file_id", fileIds)
      
      progressData?.forEach((p) => {
        progressMap[p.file_id] = p
      })
    }

    const filesWithProgress = filesData.map((file) => ({
      ...file,
      progress: progressMap[file.id] || null,
    }))

    setFiles(filesWithProgress as File[])
    setIsLoading(false)
  }, [supabase, router, filter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LibraryHeader profile={profile} onUploadComplete={fetchData} />

      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-6">
            <FilterDropdown value={filter} onValueChange={setFilter} options={FILTER_OPTIONS} />
          </div>

          <LibraryGrid files={files} onFileUpdate={fetchData} emptyMessage={filter === "all" ? "Your library is empty" : "No files found"} />
        </div>
      </main>
    </div>
  )
}
