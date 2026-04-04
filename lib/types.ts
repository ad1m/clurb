// Types matching Drizzle/SQLite schema (camelCase)

export interface User {
  id: string
  email: string
  username: string
  displayName: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ClurbFile {
  id: string
  ownerId: string
  title: string
  description: string | null
  fileUrl: string
  fileType: string
  coverImageUrl: string | null
  totalPages: number | null
  createdAt: string | null
  updatedAt: string | null
  // Joined fields
  progress?: ReadingProgress | null
  stickyNotes?: StickyNote[]
}

export interface ReadingProgress {
  id: string
  fileId: string
  userId: string
  currentPage: number | null
  lastReadAt: string | null
}

export interface StickyNote {
  id: string
  fileId: string
  authorId: string
  pageNumber: number
  content: string
  positionX: number | null
  positionY: number | null
  color: string | null
  createdAt: string | null
}

export interface Highlight {
  id: string
  fileId: string
  userId: string
  pageNumber: number
  highlightedText: string
  aiPrompt: string | null
  aiResponse: string | null
  createdAt: string | null
}

export interface ActivityLog {
  id: string
  userId: string
  fileId: string | null
  actionType: string
  metadata: string | null
  createdAt: string | null
}

export interface AgentChat {
  id: string
  userId: string
  title: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface AgentMessage {
  id: string
  chatId: string
  role: string
  content: string
  createdAt: string | null
}

export interface AgentChatWithMessages extends AgentChat {
  messages: AgentMessage[]
}

// Legacy alias for backwards compat during migration
export type Profile = User
