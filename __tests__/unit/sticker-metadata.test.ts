import { describe, it, expect } from "vitest"

// Mirrors the sticker metadata encoding/decoding from sticker.tsx
function createStickerMetadata(icon: string, shape: string, color: string): string {
  return JSON.stringify({ icon, shape, color })
}

function parseNoteMetadata(raw: string): { icon: string; shape: string; color: string } {
  const defaults = { icon: "star", shape: "rounded", color: "purple" }
  if (!raw) return defaults
  try {
    const parsed = JSON.parse(raw)
    return {
      icon: parsed.icon || defaults.icon,
      shape: parsed.shape || defaults.shape,
      color: parsed.color || defaults.color,
    }
  } catch {
    return defaults
  }
}

describe("Sticker metadata encoding", () => {
  it("round-trips icon, shape, and color", () => {
    const raw = createStickerMetadata("fire", "circle", "pink")
    const parsed = parseNoteMetadata(raw)
    expect(parsed.icon).toBe("fire")
    expect(parsed.shape).toBe("circle")
    expect(parsed.color).toBe("pink")
  })

  it("returns defaults for empty string", () => {
    const parsed = parseNoteMetadata("")
    expect(parsed.icon).toBe("star")
    expect(parsed.shape).toBe("rounded")
    expect(parsed.color).toBe("purple")
  })

  it("returns defaults for invalid JSON", () => {
    const parsed = parseNoteMetadata("not-json{{{")
    expect(parsed.icon).toBe("star")
    expect(parsed.shape).toBe("rounded")
    expect(parsed.color).toBe("purple")
  })

  it("fills missing fields with defaults when JSON is partial", () => {
    const raw = JSON.stringify({ icon: "heart" })
    const parsed = parseNoteMetadata(raw)
    expect(parsed.icon).toBe("heart")
    expect(parsed.shape).toBe("rounded")  // default
    expect(parsed.color).toBe("purple")   // default
  })
})

describe("Sticker position clamping (drag bounds)", () => {
  // Mirrors the clamp in sticker.tsx handleMouseMove
  function clampStickerPos(value: number): number {
    return Math.max(0.05, Math.min(0.95, value))
  }

  it("clamps positions below 0.05 to 0.05", () => {
    expect(clampStickerPos(0)).toBe(0.05)
    expect(clampStickerPos(-0.1)).toBe(0.05)
  })

  it("clamps positions above 0.95 to 0.95", () => {
    expect(clampStickerPos(1)).toBe(0.95)
    expect(clampStickerPos(1.5)).toBe(0.95)
  })

  it("passes through positions in the valid range", () => {
    expect(clampStickerPos(0.5)).toBe(0.5)
    expect(clampStickerPos(0.05)).toBe(0.05)
    expect(clampStickerPos(0.95)).toBe(0.95)
  })
})
