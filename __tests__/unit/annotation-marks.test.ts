import { describe, it, expect } from "vitest"
import type { Mark, HighlightMark, PenMark } from "@/components/annotation-canvas"

// Pure helper: mirrors the eraser logic from annotation-canvas.tsx
function applyEraser(marks: Mark[], pos: { x: number; y: number }, eraserRadius = 0.02): Mark[] {
  return marks.filter((mark) => {
    if (mark.type === "highlight") {
      return !(
        pos.x >= mark.x &&
        pos.x <= mark.x + mark.width &&
        pos.y >= mark.y &&
        pos.y <= mark.y + mark.height
      )
    }
    if (mark.type === "pen") {
      return !mark.points.some(
        (p) => Math.abs(p.x - pos.x) < eraserRadius && Math.abs(p.y - pos.y) < eraserRadius
      )
    }
    return true
  })
}

// Pure helper: mirrors the highlight size validation in onMouseUp
function isHighlightLargeEnough(mark: HighlightMark): boolean {
  return mark.width > 0.005 && mark.height > 0.005
}

// Pure helper: mirrors the pen validity check in onMouseUp
function isPenValid(mark: PenMark): boolean {
  return mark.points.length >= 2
}

// Pure helper: mirrors getRelativePos coordinate clamping behaviour
function clampRelative(val: number): number {
  return Math.max(0, Math.min(1, val))
}

describe("Annotation marks — highlight", () => {
  const highlight: HighlightMark = {
    type: "highlight",
    color: "#FBBF24",
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.1,
  }

  it("accepts a large-enough highlight", () => {
    expect(isHighlightLargeEnough(highlight)).toBe(true)
  })

  it("rejects a highlight that is too small", () => {
    expect(isHighlightLargeEnough({ ...highlight, width: 0.004, height: 0.003 })).toBe(false)
  })

  it("rejects when only one dimension is too small", () => {
    expect(isHighlightLargeEnough({ ...highlight, width: 0.004 })).toBe(false)
    expect(isHighlightLargeEnough({ ...highlight, height: 0.003 })).toBe(false)
  })
})

describe("Annotation marks — pen", () => {
  const pen: PenMark = {
    type: "pen",
    color: "#1a1a1a",
    lineWidth: 3,
    points: [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.15 },
      { x: 0.3, y: 0.2 },
    ],
  }

  it("accepts a pen stroke with 2+ points", () => {
    expect(isPenValid(pen)).toBe(true)
  })

  it("rejects a single-point stroke (just a tap)", () => {
    expect(isPenValid({ ...pen, points: [{ x: 0.5, y: 0.5 }] })).toBe(false)
  })

  it("rejects an empty stroke", () => {
    expect(isPenValid({ ...pen, points: [] })).toBe(false)
  })
})

describe("Eraser — removes marks it intersects", () => {
  const highlight: HighlightMark = {
    type: "highlight",
    color: "#34D399",
    x: 0.2,
    y: 0.2,
    width: 0.2,
    height: 0.1,
  }
  const pen: PenMark = {
    type: "pen",
    color: "#EF4444",
    lineWidth: 3,
    points: [
      { x: 0.6, y: 0.6 },
      { x: 0.65, y: 0.65 },
    ],
  }

  it("removes a highlight when eraser is inside it", () => {
    const result = applyEraser([highlight, pen], { x: 0.25, y: 0.25 })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("pen")
  })

  it("keeps a highlight when eraser is outside it", () => {
    const result = applyEraser([highlight, pen], { x: 0.9, y: 0.9 })
    expect(result).toHaveLength(2)
  })

  it("removes a pen stroke when eraser is near a point", () => {
    const result = applyEraser([highlight, pen], { x: 0.61, y: 0.61 })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("highlight")
  })

  it("keeps a pen stroke when eraser is far from all points", () => {
    const result = applyEraser([highlight, pen], { x: 0.1, y: 0.1 })
    expect(result).toHaveLength(2)
  })

  it("removes all marks when eraser sweeps across all of them", () => {
    const result1 = applyEraser([highlight, pen], { x: 0.25, y: 0.25 })
    const result2 = applyEraser(result1, { x: 0.61, y: 0.61 })
    expect(result2).toHaveLength(0)
  })

  it("handles an empty marks array gracefully", () => {
    expect(applyEraser([], { x: 0.5, y: 0.5 })).toEqual([])
  })
})

describe("Relative coordinate clamping", () => {
  it("clamps values below 0 to 0", () => {
    expect(clampRelative(-0.1)).toBe(0)
  })
  it("clamps values above 1 to 1", () => {
    expect(clampRelative(1.5)).toBe(1)
  })
  it("passes through values within range", () => {
    expect(clampRelative(0.5)).toBe(0.5)
    expect(clampRelative(0)).toBe(0)
    expect(clampRelative(1)).toBe(1)
  })
})
