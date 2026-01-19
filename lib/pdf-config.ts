/**
 * PDF.js Worker Configuration
 * This module configures PDF.js worker when imported
 * Import this BEFORE using any PDF.js functionality
 */

// This will only run on the client side
if (typeof window !== "undefined") {
  // Set worker immediately - don't wait for dynamic import
  ;(async () => {
    try {
      const pdfjsLib = await import("pdfjs-dist")
      // Use CDN URL to avoid bundler issues
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      console.log("[v0] PDF worker pre-configured:", pdfjsLib.GlobalWorkerOptions.workerSrc)
    } catch (error) {
      console.error("[v0] Failed to pre-configure PDF worker:", error)
    }
  })()
}

export {}
