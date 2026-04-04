import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
})

export const files = sqliteTable("files", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull().default("application/pdf"),
  coverImageUrl: text("cover_image_url"),
  totalPages: integer("total_pages").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
})

export const readingProgress = sqliteTable("reading_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  currentPage: integer("current_page").default(1),
  lastReadAt: text("last_read_at").default(sql`(datetime('now'))`),
})

export const stickyNotes = sqliteTable("sticky_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  content: text("content").notNull(),
  positionX: real("position_x").default(100),
  positionY: real("position_y").default(100),
  color: text("color").default("yellow"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
})

export const highlights = sqliteTable("highlights", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  highlightedText: text("highlighted_text").notNull(),
  aiPrompt: text("ai_prompt"),
  aiResponse: text("ai_response"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
})

export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileId: text("file_id").references(() => files.id, { onDelete: "set null" }),
  actionType: text("action_type").notNull(),
  metadata: text("metadata"), // JSON string
  createdAt: text("created_at").default(sql`(datetime('now'))`),
})

export const agentChats = sqliteTable("agent_chats", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileId: text("file_id").references(() => files.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
})

export const pageAnnotations = sqliteTable("page_annotations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  data: text("data").notNull().default("{}"), // JSON: { marks: Mark[] }
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
})

export const agentMessages = sqliteTable("agent_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  chatId: text("chat_id")
    .notNull()
    .references(() => agentChats.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant | tool
  content: text("content").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
})

export type User = typeof users.$inferSelect
export type File = typeof files.$inferSelect
export type ReadingProgress = typeof readingProgress.$inferSelect
export type StickyNote = typeof stickyNotes.$inferSelect
export type Highlight = typeof highlights.$inferSelect
export type ActivityLog = typeof activityLog.$inferSelect
export type AgentChat = typeof agentChats.$inferSelect
export type AgentMessage = typeof agentMessages.$inferSelect
export type PageAnnotation = typeof pageAnnotations.$inferSelect
