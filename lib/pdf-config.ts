/**
 * PDF.js Worker Configuration
 * This module configures PDF.js worker when imported
 * Import this BEFORE using any PDF.js functionality
 */

import { pdfjs } from "react-pdf"

// This will only run on the client side
if (typeof window !== "undefined") {
  // pdfjs 5.x uses .mjs extension for ES modules
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
}

export { pdfjs }
