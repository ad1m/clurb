import { streamText, tool, convertToCoreMessages, type Message } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { files, readingProgress, activityLog, stickyNotes } from "@/db/schema"
import { eq, desc, gte, and } from "drizzle-orm"
import { extractPdfPages } from "@/lib/local-storage"

export const maxDuration = 60


export async function POST(req: Request) {
  const { messages } = await req.json()
  const auth = await getAuthUser()

  if (!auth) return new Response("Unauthorized", { status: 401 })

  const userId = auth.id

  const tools = {
    getLastReadBook: tool({
      description: "Get the last book/file the user was reading",
      parameters: z.object({}),
      execute: async () => {
        const progress = db
          .select()
          .from(readingProgress)
          .where(eq(readingProgress.userId, userId))
          .orderBy(desc(readingProgress.lastReadAt))
          .limit(1)
          .all()

        if (!progress[0]) return { found: false, message: "No reading history found." }

        const file = db.select().from(files).where(eq(files.id, progress[0].fileId)).get()
        if (!file) return { found: false, message: "No reading history found." }

        return {
          found: true,
          title: file.title,
          currentPage: progress[0].currentPage,
          totalPages: file.totalPages,
          lastReadAt: progress[0].lastReadAt,
          percentComplete: file.totalPages! > 0
            ? Math.round((progress[0].currentPage! / file.totalPages!) * 100)
            : 0,
        }
      },
    }),

    getReadingActivity: tool({
      description: "Get reading activity summary for a time period (last week, month, etc.)",
      parameters: z.object({ days: z.number().describe("Number of days to look back") }),
      execute: async ({ days }) => {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const activity = db
          .select()
          .from(activityLog)
          .where(and(eq(activityLog.userId, userId), gte(activityLog.createdAt!, startDate.toISOString())))
          .orderBy(desc(activityLog.createdAt))
          .all()

        if (!activity.length) return { hasActivity: false, message: `No reading activity in the last ${days} days.` }

        const pagesViewed = activity.filter((a) => a.actionType === "page_viewed").length
        const notesCreated = activity.filter((a) => a.actionType === "sticky_note_created").length
        const aiQueries = activity.filter((a) => a.actionType === "ai_highlight_query").length
        const fileIds = [...new Set(activity.filter((a) => a.fileId).map((a) => a.fileId!))]

        const titles = fileIds.map((id) => {
          const f = db.select().from(files).where(eq(files.id, id)).get()
          return f?.title
        }).filter(Boolean)

        return { hasActivity: true, days, pagesViewed, notesCreated, aiQueries, booksRead: fileIds.length, bookTitles: titles.slice(0, 5) }
      },
    }),

    getDailyReadingStats: tool({
      description: "Get daily page reading counts for charting over a time period",
      parameters: z.object({ days: z.number().describe("Number of days to look back") }),
      execute: async ({ days }) => {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const activity = db
          .select({ createdAt: activityLog.createdAt })
          .from(activityLog)
          .where(and(
            eq(activityLog.userId, userId),
            eq(activityLog.actionType, "page_viewed"),
            gte(activityLog.createdAt!, startDate.toISOString())
          ))
          .all()

        const dailyCounts: Record<string, number> = {}
        const now = new Date()
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          dailyCounts[d.toISOString().split("T")[0]] = 0
        }
        activity.forEach((a) => {
          const dateStr = new Date(a.createdAt!).toISOString().split("T")[0]
          if (dailyCounts[dateStr] !== undefined) dailyCounts[dateStr]++
        })

        return { data: Object.entries(dailyCounts).map(([date, pages]) => ({ date, pages })) }
      },
    }),

    getUserBooks: tool({
      description: "Get a list of all books/files in the user's library with their reading progress",
      parameters: z.object({}),
      execute: async () => {
        const userFiles = db
          .select()
          .from(files)
          .where(eq(files.ownerId, userId))
          .orderBy(desc(files.createdAt))
          .all()

        if (!userFiles.length) return { found: false, message: "No books in your library yet." }

        const progress = db
          .select()
          .from(readingProgress)
          .where(eq(readingProgress.userId, userId))
          .all()
        const progressMap = new Map(progress.map((p) => [p.fileId, p]))

        return {
          found: true,
          count: userFiles.length,
          books: userFiles.map((f) => {
            const p = progressMap.get(f.id)
            return {
              title: f.title,
              totalPages: f.totalPages,
              currentPage: p?.currentPage || 0,
              lastReadAt: p?.lastReadAt || null,
              percentComplete: f.totalPages! > 0
                ? Math.round(((p?.currentPage || 0) / f.totalPages!) * 100)
                : 0,
            }
          }),
        }
      },
    }),

    getBookProgress: tool({
      description: "Get the user's reading progress for a specific book by title",
      parameters: z.object({ bookTitle: z.string() }),
      execute: async ({ bookTitle }) => {
        const userFiles = db
          .select()
          .from(files)
          .where(eq(files.ownerId, userId))
          .all()

        const matches = userFiles.filter((f) =>
          f.title.toLowerCase().includes(bookTitle.toLowerCase())
        )

        if (!matches.length) return { found: false, message: `No book matching "${bookTitle}" found.` }

        const fileIds = matches.map((f) => f.id)
        const progress = db
          .select()
          .from(readingProgress)
          .where(eq(readingProgress.userId, userId))
          .all()
          .filter((p) => fileIds.includes(p.fileId))

        const progressMap = new Map(progress.map((p) => [p.fileId, p]))

        return {
          found: true,
          books: matches.map((f) => {
            const p = progressMap.get(f.id)
            return {
              title: f.title,
              totalPages: f.totalPages,
              currentPage: p?.currentPage || 0,
              lastReadAt: p?.lastReadAt || null,
              percentComplete: f.totalPages! > 0
                ? Math.round(((p?.currentPage || 0) / f.totalPages!) * 100)
                : 0,
              hasStarted: !!p,
            }
          }),
        }
      },
    }),

    getUserNotes: tool({
      description: "Get sticky notes the user has left in their books",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 10 }) => {
        const notes = db
          .select()
          .from(stickyNotes)
          .where(eq(stickyNotes.authorId, userId))
          .orderBy(desc(stickyNotes.createdAt))
          .limit(limit)
          .all()

        if (!notes.length) return { found: false, message: "No sticky notes found." }

        const withTitles = notes.map((n) => {
          const file = db.select().from(files).where(eq(files.id, n.fileId)).get()
          return { content: n.content, page: n.pageNumber, fileTitle: file?.title, createdAt: n.createdAt }
        })

        return { found: true, notes: withTitles }
      },
    }),

    getBookContent: tool({
      description: "Extract text content from a PDF for a specific page range. Use this to answer questions about book content, create summaries, or explain specific sections.",
      parameters: z.object({
        bookTitle: z.string(),
        startPage: z.number(),
        endPage: z.number().describe("Max 10 pages at a time"),
      }),
      execute: async ({ bookTitle, startPage, endPage }) => {
        const maxPages = 10
        const actualEndPage = Math.min(endPage, startPage + maxPages - 1)

        const userFiles = db
          .select()
          .from(files)
          .where(eq(files.ownerId, userId))
          .all()

        const matches = userFiles.filter((f) =>
          f.title.toLowerCase().includes(bookTitle.toLowerCase())
        )

        if (!matches.length) return { success: false, message: `Could not find "${bookTitle}" in your library.` }
        if (matches.length > 1) {
          return {
            success: false,
            needsClarification: true,
            message: `Found ${matches.length} matching books. Which did you mean?`,
            matchingBooks: matches.map((f) => ({ title: f.title, totalPages: f.totalPages })),
          }
        }

        const file = matches[0]
        if (!file.fileType.includes("pdf") && !file.fileUrl.endsWith(".pdf")) {
          return { success: false, message: "Content extraction is only supported for PDF files." }
        }

        try {
          const text = await extractPdfPages(file.fileUrl, startPage, actualEndPage)
          return {
            success: true,
            bookTitle: file.title,
            totalPages: file.totalPages,
            extractedPages: { start: startPage, end: actualEndPage },
            content: text,
          }
        } catch (error) {
          return { success: false, message: `Failed to extract: ${error instanceof Error ? error.message : "Unknown error"}` }
        }
      },
    }),
  }

  const systemPrompt = `You are Clurb AI, a personal reading assistant for the Clurb app — an AI-powered reading library.
You help users understand their reading habits, get book summaries, track their progress, and explore their notes.

Available tools:
- getUserBooks: List all books with progress
- getBookProgress: Progress on a specific book
- getLastReadBook: Most recently read book
- getReadingActivity: Activity summary for a time period
- getDailyReadingStats: Daily page counts for charts
- getUserNotes: Sticky notes the user has created
- getBookContent: Extract and read actual PDF text (for summaries and Q&A)

Be conversational, specific, and helpful. Don't explain which tools you're using — just answer naturally.
When users ask for charts or visualizations, use getDailyReadingStats and describe the data clearly.
When asked for a book summary or to answer content questions, use getBookContent to read the actual text first.`

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: convertToCoreMessages(messages as Message[]),
    tools,
    maxSteps: 5,
  })

  return result.toDataStreamResponse()
}
