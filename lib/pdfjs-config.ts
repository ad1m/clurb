/**
 * PDF.js worker configuration
 * This file should be imported before any PDF rendering to avoid worker resolution errors
 */

import { pdfjs } from "react-pdf"

// Prevent PDF.js from trying to automatically resolve the worker
// Use unpkg CDN which mirrors npm packages directly
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

export { pdfjs }
