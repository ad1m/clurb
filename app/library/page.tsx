"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { ClurbFile, User } from "@/lib/types"
import { LibraryHeader } from "@/components/library-header"
import { LibraryGrid } from "@/components/library-grid"
import { FilterDropdown } from "@/components/filter-dropdown"
import { Loader2 } from "lucide-react"

const FILTER_OPTIONS = [
  { label: "all", value: "all" },
  { label: "recently read", value: "recent" },
]

export default function LibraryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [files, setFiles] = useState<ClurbFile[]>([])
  const [filter, setFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    // Get current user
    const meRes = await fetch("/api/auth/me")
    if (!meRes.ok) {
      router.push("/auth/login")
      return
    }
    const { user: currentUser } = await meRes.json()
    setUser(currentUser)

    // Get files
    const filesRes = await fetch("/api/files")
    if (filesRes.ok) {
      const { files: allFiles } = await filesRes.json()

      let filtered = allFiles as ClurbFile[]
      if (filter === "recent") {
        filtered = [...allFiles].sort((a: ClurbFile, b: ClurbFile) => {
          const aTime = a.progress?.lastReadAt || a.updatedAt || ""
          const bTime = b.progress?.lastReadAt || b.updatedAt || ""
          return bTime.localeCompare(aTime)
        }).filter((f: ClurbFile) => f.progress)
      }

      setFiles(filtered)
    }

    setIsLoading(false)
  }, [filter, router])

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
      <LibraryHeader user={user} onUploadComplete={fetchData} />

      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-6">
            <FilterDropdown value={filter} onValueChange={setFilter} options={FILTER_OPTIONS} />
          </div>

          <LibraryGrid
            files={files}
            onFileUpdate={fetchData}
            emptyMessage={filter === "recent" ? "No recently read files" : "Your library is empty"}
          />
        </div>
      </main>
    </div>
  )
}
