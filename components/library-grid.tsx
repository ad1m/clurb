"use client"

import dynamic from "next/dynamic"
import type { ClurbFile } from "@/lib/types"
import { FileText } from "lucide-react"

const FileCard = dynamic(() => import("./file-card").then((m) => m.FileCard), { ssr: false })

interface LibraryGridProps {
  files: ClurbFile[]
  emptyMessage?: string
  onFileUpdate?: () => void
}

export function LibraryGrid({ files, emptyMessage = "No files yet", onFileUpdate }: LibraryGridProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">{emptyMessage}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload a PDF to get started. Your AI agent will track everything you read.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          currentPage={file.progress?.currentPage ?? undefined}
          onUpdate={onFileUpdate}
        />
      ))}
    </div>
  )
}
