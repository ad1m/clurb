/**
 * PDF.js Worker Configuration
 * This module configures PDF.js worker when imported
 * Import this BEFORE using any PDF.js functionality
 */

import { pdfjs } from "react-pdf"

// This will only run on the client side
// Use unpkg CDN which mirrors npm packages directly
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

export { pdfjs }
