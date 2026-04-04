"use client"

import { useState, useRef, useEffect } from "react"
import type { StickyNote } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, MoreHorizontal, Trash2, Calendar } from "lucide-react"
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
  note: StickyNote
  isOwn: boolean
  onDelete?: () => void
  onUpdate?: (id: string, color: string) => void
  onDragEnd?: (x: number, y: number) => void
  containerRef?: React.RefObject<HTMLDivElement | null>
}

export function Sticker({ note, isOwn, onDelete, onUpdate, onDragEnd, containerRef }: StickerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [position, setPosition] = useState({ x: note.positionX ?? 0.5, y: note.positionY ?? 0.5 })
  const [metadata, setMetadata] = useState(() => parseNoteMetadata(note.color || ""))
  const stickerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStateRef = useRef({ startMouseX: 0, startMouseY: 0, startPosX: 0, startPosY: 0, curX: 0, curY: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isOwn || isExpanded) return
    e.preventDefault()
    e.stopPropagation()
    isDraggingRef.current = true
    dragStateRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
      curX: position.x,
      curY: position.y,
    }
    if (stickerRef.current) {
      stickerRef.current.style.zIndex = "50"
      stickerRef.current.style.cursor = "grabbing"
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef?.current || !stickerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const deltaX = (e.clientX - dragStateRef.current.startMouseX) / rect.width
      const deltaY = (e.clientY - dragStateRef.current.startMouseY) / rect.height
      const newX = Math.max(0.05, Math.min(0.95, dragStateRef.current.startPosX + deltaX))
      const newY = Math.max(0.05, Math.min(0.95, dragStateRef.current.startPosY + deltaY))
      dragStateRef.current.curX = newX
      dragStateRef.current.curY = newY
      // Update DOM directly — no React re-render during drag
      stickerRef.current.style.left = `${newX * 100}%`
      stickerRef.current.style.top = `${newY * 100}%`
    }

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      if (stickerRef.current) {
        stickerRef.current.style.zIndex = ""
        stickerRef.current.style.cursor = ""
      }
      const { curX, curY } = dragStateRef.current
      setPosition({ x: curX, y: curY })
      onDragEnd?.(curX, curY)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [containerRef, onDragEnd]) // stable deps — no position, no isDragging state

  const handleColorChange = (colorId: string) => {
    const next = { ...metadata, color: colorId }
    setMetadata(next)
    const colorStr = createStickerMetadata(next.icon, next.shape, next.color)
    onUpdate?.(note.id, colorStr)
  }

  const handleIconChange = (iconId: string) => {
    const next = { ...metadata, icon: iconId }
    setMetadata(next)
    const colorStr = createStickerMetadata(next.icon, next.shape, next.color)
    onUpdate?.(note.id, colorStr)
  }

  const icon = STICKER_ICONS.find((i) => i.id === metadata.icon) || STICKER_ICONS[0]
  const shape = STICKER_SHAPES.find((s) => s.id === metadata.shape) || STICKER_SHAPES[1]
  const color = STICKER_COLORS.find((c) => c.id === metadata.color) || STICKER_COLORS[0]

  const gradientClass = color.id === "holographic"
    ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400"
    : `bg-gradient-to-br ${color.gradient}`

  return (
    <>
      <div
        ref={stickerRef}
        className={cn(
          "absolute z-10 select-none transition-transform duration-150 hover:z-20 hover:scale-110",
          isOwn ? "cursor-grab" : "cursor-pointer"
        )}
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          transform: "translate(-50%, -50%)",
          pointerEvents: "auto",
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (!isDraggingRef.current) { e.stopPropagation(); setIsExpanded(true) }
        }}
      >
        <div className={cn("w-12 h-12 flex items-center justify-center text-2xl shadow-lg transition-all ring-2 ring-white/50", shape.class, gradientClass)}>
          {icon.emoji}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsExpanded(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Color bar */}
              <div className={cn("h-2", gradientClass)} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 flex items-center justify-center text-xl", shape.class, gradientClass)}>
                      {icon.emoji}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">{isOwn ? "You" : "Note"}</p>
                      {note.createdAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* 3-dot menu */}
                    {isOwn && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-3 space-y-3">
                          {/* Color picker */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Color</p>
                            <div className="flex flex-wrap gap-2">
                              {STICKER_COLORS.map((c) => (
                                <button
                                  key={c.id}
                                  title={c.label}
                                  onClick={() => handleColorChange(c.id)}
                                  className={cn(
                                    "w-7 h-7 rounded-full ring-2 transition-all",
                                    c.id === "holographic"
                                      ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400"
                                      : `bg-gradient-to-br ${c.gradient}`,
                                    metadata.color === c.id ? "ring-foreground scale-110" : "ring-transparent hover:ring-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Icon picker */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Icon</p>
                            <div className="grid grid-cols-6 gap-1">
                              {STICKER_ICONS.map((i) => (
                                <button
                                  key={i.id}
                                  title={i.label}
                                  onClick={() => handleIconChange(i.id)}
                                  className={cn(
                                    "w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all",
                                    metadata.icon === i.id ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted"
                                  )}
                                >
                                  {i.emoji}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Delete */}
                          <div className="border-t border-border pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 justify-start"
                              onClick={() => { onDelete?.(); setIsExpanded(false) }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete sticker
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}

                    {/* Close */}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <ScrollArea className="max-h-[300px]">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                </ScrollArea>

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">Page {note.pageNumber}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function parseNoteMetadata(colorField: string): { icon: string; shape: string; color: string } {
  if (colorField.includes(":")) {
    const [icon, shape, color] = colorField.split(":")
    return { icon, shape, color }
  }
  const legacyColorMap: Record<string, string> = {
    "#FBBF24": "amber", "#F472B6": "pink", "#60A5FA": "blue", "#34D399": "emerald",
  }
  return { icon: "star", shape: "rounded", color: legacyColorMap[colorField] || "purple" }
}

export function createStickerMetadata(icon: string, shape: string, color: string): string {
  return `${icon}:${shape}:${color}`
}
