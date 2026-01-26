"use client"

import { useState, useRef, useEffect } from "react"
import type { StickyNote as StickyNoteType, Profile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

// Sticker icons with holographic gradient support
export const STICKER_ICONS = [
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "heart", emoji: "💜", label: "Heart" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "sparkles", emoji: "✨", label: "Sparkles" },
  { id: "bookmark", emoji: "🔖", label: "Bookmark" },
  { id: "lightbulb", emoji: "💡", label: "Idea" },
  { id: "question", emoji: "❓", label: "Question" },
  { id: "exclaim", emoji: "❗", label: "Important" },
  { id: "check", emoji: "✅", label: "Done" },
  { id: "eyes", emoji: "👀", label: "Look" },
  { id: "brain", emoji: "🧠", label: "Think" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
]

export const STICKER_SHAPES = [
  { id: "circle", label: "Circle", class: "rounded-full" },
  { id: "rounded", label: "Rounded", class: "rounded-xl" },
  { id: "square", label: "Square", class: "rounded-lg" },
  { id: "hexagon", label: "Hexagon", class: "clip-hexagon" },
]

export const STICKER_COLORS = [
  { id: "purple", label: "Purple", bg: "bg-purple-500", gradient: "from-purple-400 to-purple-600" },
  { id: "blue", label: "Blue", bg: "bg-blue-500", gradient: "from-blue-400 to-blue-600" },
  { id: "pink", label: "Pink", bg: "bg-pink-500", gradient: "from-pink-400 to-pink-600" },
  { id: "amber", label: "Amber", bg: "bg-amber-500", gradient: "from-amber-400 to-amber-600" },
  { id: "emerald", label: "Emerald", bg: "bg-emerald-500", gradient: "from-emerald-400 to-emerald-600" },
  { id: "holographic", label: "Holographic", bg: "bg-gradient-to-br", gradient: "from-purple-400 via-pink-400 to-blue-400" },
]

interface StickerProps {
  note: StickyNoteType & { author?: Profile }
  isOwn: boolean
  onDelete?: () => void
  onDragEnd?: (x: number, y: number) => void
  containerRef?: React.RefObject<HTMLDivElement | null>
  scale?: number
}

export function Sticker({ note, isOwn, onDelete, onDragEnd, containerRef, scale = 1 }: StickerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: note.position_x, y: note.position_y })
  const stickerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  // Parse metadata from note (icon, shape, color)
  const metadata = parseNoteMetadata(note.color)

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isOwn || isExpanded) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    }
  }

  // Handle drag move
  useEffect(() => {
    if (!isDragging || !containerRef?.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const deltaX = (e.clientX - dragStartRef.current.x) / rect.width / scale
      const deltaY = (e.clientY - dragStartRef.current.y) / rect.height / scale

      const newX = Math.max(0.05, Math.min(0.95, dragStartRef.current.posX + deltaX))
      const newY = Math.max(0.05, Math.min(0.95, dragStartRef.current.posY + deltaY))

      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (onDragEnd) {
        onDragEnd(position.x, position.y)
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, containerRef, scale, onDragEnd, position.x, position.y])

  const icon = STICKER_ICONS.find((i) => i.id === metadata.icon) || STICKER_ICONS[0]
  const shape = STICKER_SHAPES.find((s) => s.id === metadata.shape) || STICKER_SHAPES[1]
  const color = STICKER_COLORS.find((c) => c.id === metadata.color) || STICKER_COLORS[0]

  return (
    <>
      {/* Sticker Icon */}
      <div
        ref={stickerRef}
        className={cn(
          "absolute cursor-pointer transition-all duration-200 select-none",
          isDragging ? "z-50 scale-110" : "z-10 hover:z-20 hover:scale-110",
          isOwn && "cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation()
            setIsExpanded(true)
          }
        }}
      >
        <div
          className={cn(
            "w-12 h-12 flex items-center justify-center text-2xl shadow-lg transition-all",
            shape.class,
            color.id === "holographic"
              ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 animate-gradient"
              : `bg-gradient-to-br ${color.gradient}`,
            "ring-2 ring-white/50"
          )}
        >
          {icon.emoji}
        </div>
      </div>

      {/* Expanded Card Modal */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsExpanded(false)}
          />

          {/* Information Card */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Card Header with gradient */}
              <div className={cn(
                "h-2",
                color.id === "holographic"
                  ? "bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400"
                  : `bg-gradient-to-r ${color.gradient}`
              )} />

              <div className="p-5">
                {/* Title and close */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 flex items-center justify-center text-xl",
                        shape.class,
                        color.id === "holographic"
                          ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400"
                          : `bg-gradient-to-br ${color.gradient}`
                      )}
                    >
                      {icon.emoji}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">
                        {note.author?.display_name || note.author?.username || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOwn && onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete()
                          setIsExpanded(false)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsExpanded(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Content with scroll */}
                <ScrollArea className="max-h-[300px]">
                  <div className="prose prose-sm dark:prose-invert">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  </div>
                </ScrollArea>

                {/* Page indicator */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Page {note.page_number}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Helper function to parse metadata from the color field
// Format: "icon:shape:color" or just legacy hex color
function parseNoteMetadata(colorField: string): { icon: string; shape: string; color: string } {
  // Check if it's the new format
  if (colorField.includes(":")) {
    const [icon, shape, color] = colorField.split(":")
    return { icon, shape, color }
  }

  // Legacy format - convert hex colors to new format
  const legacyColorMap: Record<string, string> = {
    "#FBBF24": "amber",
    "#F472B6": "pink",
    "#60A5FA": "blue",
    "#34D399": "emerald",
  }

  return {
    icon: "star",
    shape: "rounded",
    color: legacyColorMap[colorField] || "purple",
  }
}

// Helper function to create metadata string
export function createStickerMetadata(icon: string, shape: string, color: string): string {
  return `${icon}:${shape}:${color}`
}
