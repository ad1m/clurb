/**
 * PDF.js worker configuration
 * This file should be imported before any PDF rendering to avoid worker resolution errors
 */

import { pdfjs } from "react-pdf"

// Prevent PDF.js from trying to automatically resolve the worker
// Use a direct URL to avoid Next.js module resolution issues
if (typeof window !== "undefined") {
  // Set the worker source to a CDN that serves the CommonJS build
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
}

export { pdfjs }
