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
import { MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileActionsMenuProps {
  fileId: string
  fileName: string
  onUpdate: () => void
}

export function FileActionsMenu({ fileId, fileName, onUpdate }: FileActionsMenuProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [newTitle, setNewTitle] = useState(fileName)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleRename = async () => {
    if (!newTitle.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to rename")
      toast({ title: "File renamed", description: `Renamed to "${newTitle}".` })
      setShowRenameDialog(false)
      onUpdate()
    } catch (error) {
      toast({ title: "Rename failed", description: error instanceof Error ? error.message : "Error", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
      toast({ title: "File deleted", description: `"${fileName}" removed from your library.` })
      setShowDeleteDialog(false)
      onUpdate()
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Error", variant: "destructive" })
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRenameDialog(true) }}>
            <Pencil className="w-4 h-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteDialog(true) }}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>Enter a new name for this file.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-title">Title</Label>
            <Input id="new-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleRename} disabled={!newTitle.trim() || isLoading}>
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Renaming...</> : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{fileName}"? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
