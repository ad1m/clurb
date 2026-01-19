"use client"

import { useEffect, useState } from "react"

/**
 * PDF.js Setup Provider
 * Configures PDF.js worker globally on the client side BEFORE rendering children
 */
export function PDFSetupProvider({ children }: { children: React.ReactNode }) {
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    // Configure PDF.js worker IMMEDIATELY on client side
    const setupPDFWorker = async () => {
      try {
        // Import pdfjs-dist directly for full control
        const pdfjsLib = await import("pdfjs-dist")

        // Force set the worker source - use absolute CDN URL
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        console.log("[v0] PDF.js worker configured globally:", pdfjsLib.GlobalWorkerOptions.workerSrc)

        // Mark as configured
        setIsConfigured(true)
      } catch (error) {
        console.error("[v0] Failed to configure PDF.js worker:", error)
        // Still render children even if config fails
        setIsConfigured(true)
      }
    }

    setupPDFWorker()
  }, [])

  // Don't render children until worker is configured
  if (!isConfigured) {
    return null
  }

  return <>{children}</>
}
