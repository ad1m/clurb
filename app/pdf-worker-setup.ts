"use client"

/**
 * PDF.js Worker Setup
 * This must be imported in the root layout to configure the worker before any PDF operations
 */

if (typeof window !== "undefined") {
  // Dynamically import pdfjs to avoid SSR issues
  import("pdfjs-dist").then((pdfjsLib) => {
    // Configure worker to use CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    console.log("[PDF.js] Worker configured:", pdfjsLib.GlobalWorkerOptions.workerSrc)
  }).catch((error) => {
    console.error("[PDF.js] Failed to configure worker:", error)
  })
}

export {}
