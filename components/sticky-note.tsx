"use client"

import type React from "react"

import { useState } from "react"
import type { StickyNote as StickyNoteType, Profile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { X, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface StickyNoteProps {
  note: StickyNoteType & { author?: Profile }
  isOwn: boolean
  onDelete?: () => void
  containerRef?: React.RefObject<HTMLDivElement | null>
}

const STICKY_COLORS: Record<string, string> = {
  "#FBBF24": "bg-sticky-yellow",
  "#F472B6": "bg-sticky-pink",
  "#60A5FA": "bg-sticky-blue",
  "#34D399": "bg-sticky-green",
}

export function StickyNote({ note, isOwn, onDelete }: StickyNoteProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const colorClass = STICKY_COLORS[note.color] || "bg-sticky-yellow"
  const initials =
    note.author?.display_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    note.author?.username?.[0]?.toUpperCase() ||
    "?"

  return (
    <div
      className={cn(
        "absolute w-48 rounded-lg shadow-lg transition-all cursor-pointer",
        colorClass,
        isExpanded ? "z-50 w-64" : "z-10 hover:z-20 hover:scale-105",
      )}
      style={{
        left: `${note.position_x * 100}%`,
        top: `${note.position_y * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-black/10">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-black/30" />
          <Avatar className="w-5 h-5">
            <AvatarImage src={note.author?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-black/10">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-black/70 truncate max-w-20">
            {note.author?.display_name || note.author?.username}
          </span>
        </div>
        {isOwn && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 hover:bg-black/10"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <X className="w-3 h-3 text-black/50" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className={cn("text-sm text-black/80 leading-relaxed", !isExpanded && "line-clamp-3")}>{note.content}</p>
        <p className="text-[10px] text-black/40 mt-2">
          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
