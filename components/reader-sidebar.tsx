"use client"

import type { File, FileMember, Profile, ReadingProgress } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Users, BookOpen } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ReaderSidebarProps {
  file: File
  members: (FileMember & { user?: Profile; progress?: ReadingProgress })[]
  currentUserId: string
  onlineUserIds?: string[]
}

export function ReaderSidebar({ file, members, currentUserId, onlineUserIds = [] }: ReaderSidebarProps) {
  return (
    <div className="w-72 border-l border-border bg-card flex flex-col h-full">
      {/* File Info */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold truncate">{file.title}</h2>
        {file.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{file.description}</p>}
        {file.total_pages > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            <BookOpen className="w-3 h-3 inline mr-1" />
            {file.total_pages} pages
          </p>
        )}
      </div>

      {/* Members Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="w-4 h-4" />
            Reading Together ({members.length})
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {onlineUserIds.length} online now
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId
              const initials =
                member.user?.display_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() ||
                member.user?.username?.[0]?.toUpperCase() ||
                "?"

              const isOnline = onlineUserIds.includes(member.user_id)
              
              return (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
                  <div className="relative">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={member.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.user?.display_name || member.user?.username}
                      {isCurrentUser && <span className="text-muted-foreground"> (you)</span>}
                    </p>
                    {member.progress ? (
                      <p className="text-xs text-muted-foreground">
                        Page {member.progress.current_page}
                        {member.progress.last_read_at && (
                          <span>
                            {" "}
                            · {formatDistanceToNow(new Date(member.progress.last_read_at), { addSuffix: true })}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not started</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Quick Stats */}
      <div className="p-4">
        <p className="text-xs text-muted-foreground">
          Added {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
