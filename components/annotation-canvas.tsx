"use client"

import { useRef, useEffect, useCallback } from "react"

export type HighlightMark = {
  type: "highlight"
  color: string
  x: number // relative 0–1
  y: number // relative 0–1
  width: number // relative 0–1
  height: number // relative 0–1
}

export type PenMark = {
  type: "pen"
  color: string
  lineWidth: number
  points: { x: number; y: number }[] // relative 0–1
}

export type Mark = HighlightMark | PenMark

interface AnnotationCanvasProps {
  marks: Mark[]
  activeTool: "highlight" | "pen" | "eraser" | null
  activeColor: string
  onMarksChange: (marks: Mark[]) => void
}

function drawMarks(ctx: CanvasRenderingContext2D, marks: Mark[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  for (const mark of marks) {
    if (mark.type === "highlight") {
      ctx.save()
      ctx.globalAlpha = 0.35
      ctx.fillStyle = mark.color
      ctx.fillRect(mark.x * w, mark.y * h, mark.width * w, mark.height * h)
      ctx.restore()
    } else if (mark.type === "pen") {
      if (mark.points.length < 2) continue
      ctx.save()
      ctx.strokeStyle = mark.color
      ctx.lineWidth = mark.lineWidth
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.beginPath()
      ctx.moveTo(mark.points[0].x * w, mark.points[0].y * h)
      for (let i = 1; i < mark.points.length; i++) {
        ctx.lineTo(mark.points[i].x * w, mark.points[i].y * h)
      }
      ctx.stroke()
      ctx.restore()
    }
  }
}

export function AnnotationCanvas({ marks, activeTool, activeColor, onMarksChange }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const currentMarkRef = useRef<Mark | null>(null)
  // Track mouse start for highlight drag
  const startPosRef = useRef({ x: 0, y: 0 })

  const getRelativePos = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }, [])

  // Resize canvas to match CSS size
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect()
      if (width === 0 || height === 0) return
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (ctx) drawMarks(ctx, marks, width, height)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [marks])

  // Redraw when marks change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    drawMarks(ctx, marks, canvas.width, canvas.height)
  }, [marks])

  // Mouse event handlers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMouseDown = (e: MouseEvent) => {
      if (!activeTool) return
      e.preventDefault()
      e.stopPropagation()
      isDrawingRef.current = true
      const pos = getRelativePos(e)

      if (activeTool === "highlight") {
        startPosRef.current = pos
        currentMarkRef.current = {
          type: "highlight",
          color: activeColor,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
        }
      } else if (activeTool === "pen") {
        currentMarkRef.current = {
          type: "pen",
          color: activeColor,
          lineWidth: 3,
          points: [pos],
        }
      } else if (activeTool === "eraser") {
        // Will handle in mousemove
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current || !activeTool) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const pos = getRelativePos(e)
      const w = canvas.width
      const h = canvas.height

      if (activeTool === "highlight" && currentMarkRef.current?.type === "highlight") {
        const start = startPosRef.current
        const mark = currentMarkRef.current as HighlightMark
        mark.x = Math.min(start.x, pos.x)
        mark.y = Math.min(start.y, pos.y)
        mark.width = Math.abs(pos.x - start.x)
        mark.height = Math.abs(pos.y - start.y)
        drawMarks(ctx, marks, w, h)
        // Draw current in-progress highlight
        ctx.save()
        ctx.globalAlpha = 0.35
        ctx.fillStyle = mark.color
        ctx.fillRect(mark.x * w, mark.y * h, mark.width * w, mark.height * h)
        ctx.restore()
      } else if (activeTool === "pen" && currentMarkRef.current?.type === "pen") {
        currentMarkRef.current.points.push(pos)
        // Draw just the new segment for performance
        const pts = currentMarkRef.current.points
        if (pts.length >= 2) {
          const prev = pts[pts.length - 2]
          ctx.save()
          ctx.strokeStyle = currentMarkRef.current.color
          ctx.lineWidth = currentMarkRef.current.lineWidth
          ctx.lineCap = "round"
          ctx.lineJoin = "round"
          ctx.beginPath()
          ctx.moveTo(prev.x * w, prev.y * h)
          ctx.lineTo(pos.x * w, pos.y * h)
          ctx.stroke()
          ctx.restore()
        }
      } else if (activeTool === "eraser") {
        // Remove any marks the eraser touches
        const updated = marks.filter((mark) => {
          if (mark.type === "highlight") {
            // Check if eraser pos is inside the highlight rect
            return !(
              pos.x >= mark.x && pos.x <= mark.x + mark.width &&
              pos.y >= mark.y && pos.y <= mark.y + mark.height
            )
          } else if (mark.type === "pen") {
            // Remove if any point is near eraser
            const eraserRadius = 0.02
            return !mark.points.some(
              (p) => Math.abs(p.x - pos.x) < eraserRadius && Math.abs(p.y - pos.y) < eraserRadius
            )
          }
          return true
        })
        if (updated.length !== marks.length) {
          onMarksChange(updated)
        }
      }
    }

    const onMouseUp = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false

      if (activeTool === "highlight" || activeTool === "pen") {
        const mark = currentMarkRef.current
        if (mark) {
          if (mark.type === "highlight" && mark.width > 0.005 && mark.height > 0.005) {
            onMarksChange([...marks, mark])
          } else if (mark.type === "pen" && mark.points.length >= 2) {
            onMarksChange([...marks, mark])
          }
        }
      }
      currentMarkRef.current = null
    }

    canvas.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [activeTool, activeColor, marks, onMarksChange, getRelativePos])

  const cursor =
    activeTool === "pen" ? "crosshair" :
    activeTool === "highlight" ? "crosshair" :
    activeTool === "eraser" ? "cell" :
    "default"

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        pointerEvents: activeTool ? "auto" : "none",
        zIndex: activeTool ? 10 : "auto",
        // Only block text selection while actively drawing — never when tool is off
        userSelect: activeTool ? "none" : undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor, display: "block" }}
      />
    </div>
  )
}
