export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface File {
  id: string
  owner_id: string
  title: string
  description: string | null
  file_url: string
  file_type: string
  cover_image_url: string | null
  total_pages: number
  created_at: string
  updated_at: string
  owner?: Profile
}

export interface FileMember {
  id: string
  file_id: string
  user_id: string
  role: "owner" | "editor" | "viewer"
  invited_at: string
  user?: Profile
}

export interface ReadingProgress {
  id: string
  file_id: string
  user_id: string
  current_page: number
  last_read_at: string
  user?: Profile
}

export interface StickyNote {
  id: string
  file_id: string
  author_id: string
  page_number: number
  content: string
  position_x: number
  position_y: number
  color: string
  is_surprise: boolean
  created_at: string
  author?: Profile
}

export interface ChatMessage {
  id: string
  file_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: Profile
}

export interface Highlight {
  id: string
  file_id: string
  user_id: string
  page_number: number
  highlighted_text: string
  start_offset: number | null
  end_offset: number | null
  ai_prompt: string | null
  ai_response: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  file_id: string | null
  action_type: string
  metadata: Record<string, unknown>
  created_at: string
  file?: File
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: "pending" | "accepted" | "declined"
  created_at: string
  user?: Profile
  friend?: Profile
}

export interface FileInvitation {
  id: string
  file_id: string
  from_user_id: string
  to_user_id: string
  status: "pending" | "accepted" | "declined"
  message: string | null
  created_at: string
  responded_at: string | null
  file?: File
  inviter?: Profile
}

// Action types for activity logging
export type ActivityActionType =
  | "file_uploaded"
  | "file_view"
  | "page_viewed"
  | "sticky_note_created"
  | "sticky_note_viewed"
  | "chat_message_sent"
  | "highlight_created"
  | "ai_highlight_query"
  | "friend_added"
  | "file_shared"
  | "file_joined"
