"use client"

import { Pen, Highlighter, Eraser, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#FBBF24" },
  { label: "Green", value: "#34D399" },
  { label: "Blue", value: "#60A5FA" },
  { label: "Pink", value: "#F472B6" },
  { label: "Orange", value: "#FB923C" },
]

const PEN_COLORS = [
  { label: "Black", value: "#1a1a1a" },
  { label: "Red", value: "#EF4444" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#22C55E" },
  { label: "Purple", value: "#A855F7" },
]

interface AnnotationToolbarProps {
  activeTool: "highlight" | "pen" | "eraser" | null
  activeColor: string
  onToolChange: (tool: "highlight" | "pen" | "eraser" | null) => void
  onColorChange: (color: string) => void
  onClearAll: () => void
  onClose: () => void
}

export function AnnotationToolbar({
  activeTool,
  activeColor,
  onToolChange,
  onColorChange,
  onClearAll,
  onClose,
}: AnnotationToolbarProps) {
  const colors = activeTool === "pen" ? PEN_COLORS : HIGHLIGHT_COLORS

  return (
    <div className="flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg px-2 py-1.5">
      {/* Tool buttons */}
      <Button
        variant={activeTool === "highlight" ? "default" : "ghost"}
        size="icon"
        className="h-8 w-8"
        title="Highlighter"
        onClick={() => onToolChange(activeTool === "highlight" ? null : "highlight")}
      >
        <Highlighter className="w-4 h-4" />
      </Button>

      <Button
        variant={activeTool === "pen" ? "default" : "ghost"}
        size="icon"
        className="h-8 w-8"
        title="Pen"
        onClick={() => onToolChange(activeTool === "pen" ? null : "pen")}
      >
        <Pen className="w-4 h-4" />
      </Button>

      <Button
        variant={activeTool === "eraser" ? "default" : "ghost"}
        size="icon"
        className="h-8 w-8"
        title="Eraser"
        onClick={() => onToolChange(activeTool === "eraser" ? null : "eraser")}
      >
        <Eraser className="w-4 h-4" />
      </Button>

      {/* Color swatches — shown when highlight or pen is active */}
      {(activeTool === "highlight" || activeTool === "pen") && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <div className="flex items-center gap-1">
            {colors.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => onColorChange(c.value)}
                className={cn(
                  "w-5 h-5 rounded-full border-2 transition-transform",
                  activeColor === c.value ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </>
      )}

      <div className="w-px h-6 bg-border mx-1" />

      {/* Clear all */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        title="Clear all annotations"
        onClick={onClearAll}
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {/* Close toolbar */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Close annotation tools"
        onClick={onClose}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}
