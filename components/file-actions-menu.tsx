"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoreVertical, Pencil, Trash2, Loader2, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ShareFileDialog } from "./share-file-dialog"

interface FileActionsMenuProps {
  fileId: string
  fileName: string
  onUpdate: () => void
}

export function FileActionsMenu({ fileId, fileName, onUpdate }: FileActionsMenuProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [newTitle, setNewTitle] = useState(fileName)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleRename = async () => {
    if (!newTitle.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to rename file")
      }

      toast({
        title: "File renamed",
        description: `"${fileName}" has been renamed to "${newTitle}".`,
      })

      setShowRenameDialog(false)
      onUpdate()
    } catch (error) {
      console.error("[v0] Rename error:", error)
      toast({
        title: "Rename failed",
        description: error instanceof Error ? error.message : "Could not rename the file",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete file")
      }

      toast({
        title: "File deleted",
        description: `"${fileName}" has been deleted from your library.`,
      })

      setShowDeleteDialog(false)
      onUpdate()
    } catch (error) {
      console.error("[v0] Delete error:", error)
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete the file",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowShareDialog(true)
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share with Friend
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowRenameDialog(true)
            }}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowDeleteDialog(true)
            }}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>Enter a new name for this file.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-title">File Name</Label>
            <Input
              id="new-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newTitle.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Rename"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share File Dialog */}
      <ShareFileDialog
        fileId={fileId}
        fileName={fileName}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{fileName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
