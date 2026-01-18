"use client"
import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Plus, Upload, FileText, Loader2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UploadDialogProps {
  onUploadComplete?: () => void
}

export function UploadDialog({ onUploadComplete }: UploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setFile(file)
      setTitle(file.name.replace(/\.[^/.]+$/, ""))
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/epub+zip": [".epub"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB - Vercel Blob supports large files
  })

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(5)

    try {
      // Upload file using FormData with XMLHttpRequest for progress tracking
      const blobUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append("file", file)
        
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = 5 + Math.round((e.loaded / e.total) * 75)
            setUploadProgress(percent)
          }
        })

        xhr.addEventListener("load", () => {
          console.log("[v0] XHR status:", xhr.status)
          console.log("[v0] XHR response:", xhr.responseText)
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              if (response.url) {
                resolve(response.url)
              } else {
                reject(new Error(response.error || "Upload failed"))
              }
            } catch (parseError) {
              console.error("[v0] JSON parse error:", parseError)
              reject(new Error("Invalid server response: " + xhr.responseText.substring(0, 100)))
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText.substring(0, 100)}`))
          }
        })

        xhr.addEventListener("error", () => reject(new Error("Network error")))
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")))

        xhr.open("POST", "/api/blob-upload")
        // Don't set Content-Type - let browser set it with boundary for multipart/form-data
        xhr.send(formData)
      })

      setUploadProgress(85)

      // Save file metadata to database
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blobUrl,
          title: title || file.name.replace(/\.[^/.]+$/, ""),
          fileName: file.name,
          fileType: file.type,
        }),
      })

      setUploadProgress(95)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save file")
      }

      setUploadProgress(100)

      toast({
        title: "Upload successful",
        description: `"${title || file.name}" has been added to your library.`,
      })

      await new Promise(resolve => setTimeout(resolve, 300))

      setOpen(false)
      setFile(null)
      setTitle("")
      setUploadProgress(0)
      onUploadComplete?.()
    } catch (error) {
      console.error("[v0] Upload error:", error)
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "There was an error uploading your file. Please try again.",
        variant: "destructive",
      })
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setTitle("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" className="rounded-full bg-transparent">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a Document</DialogTitle>
          <DialogDescription>Add a PDF or document to your library to share with friends.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-hidden">
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">
                {isDragActive ? "Drop your file here..." : "Drag & drop your file here"}
              </p>
              <p className="text-xs text-muted-foreground">or click to browse (PDF, EPUB, TXT - max 50MB)</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl overflow-hidden">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile} className="shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {file && (
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">{uploadProgress}% uploaded</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
