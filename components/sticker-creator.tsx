"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sticker as StickerIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  STICKER_ICONS,
  STICKER_SHAPES,
  STICKER_COLORS,
  createStickerMetadata,
} from "./sticker"

interface StickerCreatorProps {
  onCreateSticker: (title: string, content: string, metadata: string, x: number, y: number) => Promise<void>
  isCreating: boolean
  initialTitle?: string
  initialContent?: string
}

export function StickerCreator({
  onCreateSticker,
  isCreating,
  initialTitle = "",
  initialContent = "",
}: StickerCreatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPlacing, setIsPlacing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [selectedIcon, setSelectedIcon] = useState(STICKER_ICONS[0].id)
  const [selectedShape, setSelectedShape] = useState(STICKER_SHAPES[1].id)
  const [selectedColor, setSelectedColor] = useState(STICKER_COLORS[0].id)
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 })

  const handleOpenDialog = () => {
    setTitle(initialTitle)
    setContent(initialContent)
    setIsOpen(true)
  }

  const handlePlaceSticker = () => {
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

    const metadata = createStickerMetadata(selectedIcon, selectedShape, selectedColor)
    await onCreateSticker(title, content, metadata, position.x, position.y)

    // Reset form
    setTitle("")
    setContent("")
    setSelectedIcon(STICKER_ICONS[0].id)
    setSelectedShape(STICKER_SHAPES[1].id)
    setSelectedColor(STICKER_COLORS[0].id)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsPlacing(false)
    setIsOpen(false)
  }

  const icon = STICKER_ICONS.find((i) => i.id === selectedIcon) || STICKER_ICONS[0]
  const shape = STICKER_SHAPES.find((s) => s.id === selectedShape) || STICKER_SHAPES[1]
  const color = STICKER_COLORS.find((c) => c.id === selectedColor) || STICKER_COLORS[0]

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleOpenDialog}>
        <StickerIcon className="w-4 h-4" />
        Add Sticker
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create a Sticker</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            <div className="flex items-center justify-center py-4">
              <div
                className={cn(
                  "w-16 h-16 flex items-center justify-center text-3xl shadow-lg transition-all",
                  shape.class,
                  color.id === "holographic"
                    ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400"
                    : `bg-gradient-to-br ${color.gradient}`,
                  "ring-2 ring-white/50"
                )}
              >
                {icon.emoji}
              </div>
            </div>

            <Tabs defaultValue="icon" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="icon">Icon</TabsTrigger>
                <TabsTrigger value="shape">Shape</TabsTrigger>
                <TabsTrigger value="color">Color</TabsTrigger>
              </TabsList>

              <TabsContent value="icon" className="mt-3">
                <div className="grid grid-cols-6 gap-2">
                  {STICKER_ICONS.map((ic) => (
                    <button
                      key={ic.id}
                      onClick={() => setSelectedIcon(ic.id)}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-all hover:scale-110",
                        selectedIcon === ic.id
                          ? "bg-primary/20 ring-2 ring-primary"
                          : "bg-muted hover:bg-muted/80"
                      )}
                      title={ic.label}
                    >
                      {ic.emoji}
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="shape" className="mt-3">
                <div className="grid grid-cols-4 gap-2">
                  {STICKER_SHAPES.map((sh) => (
                    <button
                      key={sh.id}
                      onClick={() => setSelectedShape(sh.id)}
                      className={cn(
                        "h-12 flex items-center justify-center text-sm font-medium transition-all",
                        sh.class,
                        selectedShape === sh.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="color" className="mt-3">
                <div className="grid grid-cols-6 gap-2">
                  {STICKER_COLORS.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setSelectedColor(col.id)}
                      className={cn(
                        "w-10 h-10 rounded-full transition-all hover:scale-110",
                        col.id === "holographic"
                          ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400"
                          : `bg-gradient-to-br ${col.gradient}`,
                        selectedColor === col.id && "ring-2 ring-offset-2 ring-primary"
                      )}
                      title={col.label}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Title (optional) */}
            <div className="space-y-2">
              <Label htmlFor="sticker-title">Title (optional)</Label>
              <Input
                id="sticker-title"
                placeholder="Give your sticker a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="sticker-content">Content</Label>
              <ScrollArea className="h-[120px] rounded-md border">
                <Textarea
                  id="sticker-content"
                  placeholder="Write your note here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] border-0 resize-none focus-visible:ring-0"
                />
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handlePlaceSticker}>
              Choose Position
            </Button>
            <Button onClick={handleSubmit} disabled={!content.trim() || isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Sticker"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Placing overlay */}
      {isPlacing && (
        <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center pointer-events-none">
          <div className="bg-background px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 flex items-center justify-center text-lg",
                shape.class,
                color.id === "holographic"
                  ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400"
                  : `bg-gradient-to-br ${color.gradient}`
              )}
            >
              {icon.emoji}
            </div>
            Click on the page to place your sticker
          </div>
        </div>
      )}
    </>
  )
}

// Simpler version for creating from AI responses
interface QuickStickerCreatorProps {
  title: string
  content: string
  onCreateSticker: (title: string, content: string, metadata: string, x: number, y: number) => Promise<void>
  isCreating: boolean
  onClose: () => void
}

export function QuickStickerCreator({
  title,
  content,
  onCreateSticker,
  isCreating,
  onClose,
}: QuickStickerCreatorProps) {
  const [isPlacing, setIsPlacing] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState("lightbulb")
  const [selectedColor, setSelectedColor] = useState("purple")

  const handlePlace = () => {
    setIsPlacing(true)

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const pageContainer = target.closest(".react-pdf__Page")

      if (pageContainer) {
        const rect = pageContainer.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height

        const metadata = createStickerMetadata(selectedIcon, "rounded", selectedColor)
        onCreateSticker(title, content, metadata, x, y)
        setIsPlacing(false)
        onClose()
        document.removeEventListener("click", handleClick)
      }
    }

    setTimeout(() => {
      document.addEventListener("click", handleClick, { once: true })
    }, 100)
  }

  const icon = STICKER_ICONS.find((i) => i.id === selectedIcon) || STICKER_ICONS[5]
  const color = STICKER_COLORS.find((c) => c.id === selectedColor) || STICKER_COLORS[0]

  return (
    <>
      <Dialog open={!isPlacing} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Sticker from AI Response</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick icon selection */}
            <div className="flex items-center gap-2">
              <Label className="shrink-0">Icon:</Label>
              <div className="flex gap-1 flex-wrap">
                {STICKER_ICONS.slice(0, 8).map((ic) => (
                  <button
                    key={ic.id}
                    onClick={() => setSelectedIcon(ic.id)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center text-lg rounded-md transition-all",
                      selectedIcon === ic.id
                        ? "bg-primary/20 ring-1 ring-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {ic.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick color selection */}
            <div className="flex items-center gap-2">
              <Label className="shrink-0">Color:</Label>
              <div className="flex gap-1">
                {STICKER_COLORS.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => setSelectedColor(col.id)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all",
                      col.id === "holographic"
                        ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400"
                        : `bg-gradient-to-br ${col.gradient}`,
                      selectedColor === col.id && "ring-2 ring-offset-1 ring-primary"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-10 h-10 flex items-center justify-center text-xl rounded-xl shrink-0",
                    color.id === "holographic"
                      ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400"
                      : `bg-gradient-to-br ${color.gradient}`
                  )}
                >
                  {icon.emoji}
                </div>
                <div className="min-w-0">
                  {title && <p className="font-medium text-sm truncate">{title}</p>}
                  <p className="text-xs text-muted-foreground line-clamp-2">{content}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handlePlace} disabled={isCreating}>
              Place on Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isPlacing && (
        <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center pointer-events-none">
          <div className="bg-background px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 flex items-center justify-center text-lg rounded-xl",
                color.id === "holographic"
                  ? "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400"
                  : `bg-gradient-to-br ${color.gradient}`
              )}
            >
              {icon.emoji}
            </div>
            Click on the page to place your sticker
          </div>
        </div>
      )}
    </>
  )
}
