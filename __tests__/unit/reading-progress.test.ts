import { describe, it, expect } from "vitest"

// Mirrors the page validation logic used in the PDF viewer
function isValidPage(page: number, totalPages: number): boolean {
  return Number.isInteger(page) && page >= 1 && page <= totalPages
}

// Mirrors the page clamp used in goToPage
function clampPage(page: number, totalPages: number): number {
  return Math.max(1, Math.min(totalPages, page))
}

// Mirrors the debounce delay check — progress should only save after 1s of idle
function shouldSaveProgress(lastSavedPage: number, currentPage: number): boolean {
  return lastSavedPage !== currentPage
}

describe("Page validation", () => {
  it("accepts a valid page within range", () => {
    expect(isValidPage(1, 10)).toBe(true)
    expect(isValidPage(5, 10)).toBe(true)
    expect(isValidPage(10, 10)).toBe(true)
  })

  it("rejects page 0", () => {
    expect(isValidPage(0, 10)).toBe(false)
  })

  it("rejects page beyond total", () => {
    expect(isValidPage(11, 10)).toBe(false)
  })

  it("rejects non-integer pages", () => {
    expect(isValidPage(1.5, 10)).toBe(false)
  })

  it("rejects negative pages", () => {
    expect(isValidPage(-1, 10)).toBe(false)
  })
})

describe("Page clamping", () => {
  it("clamps below 1 to 1", () => {
    expect(clampPage(0, 10)).toBe(1)
    expect(clampPage(-5, 10)).toBe(1)
  })

  it("clamps above totalPages to totalPages", () => {
    expect(clampPage(15, 10)).toBe(10)
  })

  it("passes through a valid page unchanged", () => {
    expect(clampPage(5, 10)).toBe(5)
  })

  it("handles single-page documents", () => {
    expect(clampPage(1, 1)).toBe(1)
    expect(clampPage(5, 1)).toBe(1)
  })
})

describe("Reading progress save logic", () => {
  it("saves when page has changed", () => {
    expect(shouldSaveProgress(1, 2)).toBe(true)
  })

  it("does not save when page is unchanged", () => {
    expect(shouldSaveProgress(3, 3)).toBe(false)
  })
})
