"use client"

import { useEffect } from "react"

/**
 * PDF.js Setup Provider
 * Configures PDF.js worker globally on the client side
 */
export function PDFSetupProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Configure PDF.js worker as soon as the app loads on client side
    const setupPDFWorker = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist")

        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
          console.log("[v0] PDF.js worker configured globally:", pdfjsLib.GlobalWorkerOptions.workerSrc)
        }
      } catch (error) {
        console.error("[v0] Failed to configure PDF.js worker:", error)
      }
    }

    setupPDFWorker()
  }, [])

  return <>{children}</>
}
