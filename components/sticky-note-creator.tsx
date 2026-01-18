"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StickyNote, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface StickyNoteCreatorProps {
  onCreateNote: (content: string, color: string, x: number, y: number) => Promise<void>
  isCreating: boolean
}

const COLORS = [
  { value: "#FBBF24", label: "Yellow", class: "bg-sticky-yellow" },
  { value: "#F472B6", label: "Pink", class: "bg-sticky-pink" },
  { value: "#60A5FA", label: "Blue", class: "bg-sticky-blue" },
  { value: "#34D399", label: "Green", class: "bg-sticky-green" },
]

export function StickyNoteCreator({ onCreateNote, isCreating }: StickyNoteCreatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPlacing, setIsPlacing] = useState(false)
  const [content, setContent] = useState("")
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value)
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 })

  const handlePlaceNote = () => {
    setIsPlacing(true)
    setIsOpen(false)

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const pageContainer = target.closest(".react-pdf__Page")

      if (pageContainer) {
        const rect = pageContainer.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height

        setPosition({ x: Math.max(0.1, Math.min(0.9, x)), y: Math.max(0.1, Math.min(0.9, y)) })
        setIsPlacing(false)
        setIsOpen(true)
        document.removeEventListener("click", handleClick)
      }
    }

    setTimeout(() => {
      document.addEventListener("click", handleClick, { once: true })
    }, 100)
  }

  const handleSubmit = async () => {
    if (!content.trim()) return

    await onCreateNote(content, selectedColor, position.x, position.y)
    setContent("")
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsPlacing(false)
    setContent("")
    setIsOpen(false)
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <StickyNote className="w-4 h-4" />
            Add Note
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Leave a sticky note</h4>
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.class,
                      selectedColor === color.value ? "ring-2 ring-primary ring-offset-2" : "hover:scale-110",
                    )}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-content">Your message</Label>
              <Textarea
                id="note-content"
                placeholder="Write something for your friends to discover..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={handlePlaceNote}>
                Place on Page
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!content.trim() || isCreating}>
                {isCreating ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {isPlacing && (
        <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center pointer-events-none">
          <div className="bg-background px-4 py-2 rounded-full shadow-lg text-sm font-medium">
            Click on the page to place your note
          </div>
        </div>
      )}
    </>
  )
}
