import { streamText, tool, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages } = await req.json()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userId = user.id

  // Define tools for the AI agent to query reading data
  const tools = {
    getLastReadBook: tool({
      description: "Get the last book/file the user was reading",
      parameters: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from("reading_progress")
          .select(`
            *,
            file:files(*)
          `)
          .eq("user_id", userId)
          .order("last_read_at", { ascending: false })
          .limit(1)
          .single()

        if (!data?.file) return { found: false, message: "No reading history found." }
        return {
          found: true,
          title: data.file.title,
          currentPage: data.current_page,
          totalPages: data.file.total_pages,
          lastReadAt: data.last_read_at,
        }
      },
    }),

    getReadingActivity: tool({
      description: "Get reading activity summary for a time period (last week, month, etc.)",
      parameters: z.object({
        days: z.number().describe("Number of days to look back"),
      }),
      execute: async ({ days }) => {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const { data: activity } = await supabase
          .from("activity_log")
          .select(`
            *,
            file:files(title)
          `)
          .eq("user_id", userId)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false })

        if (!activity || activity.length === 0) {
          return { hasActivity: false, message: `No reading activity in the last ${days} days.` }
        }

        // Aggregate stats
        const pagesViewed = activity.filter((a) => a.action_type === "page_viewed").length
        const notesCreated = activity.filter((a) => a.action_type === "sticky_note_created").length
        const messagesSent = activity.filter((a) => a.action_type === "chat_message_sent").length
        const uniqueFiles = [...new Set(activity.filter((a) => a.file).map((a) => a.file?.title))]

        return {
          hasActivity: true,
          days,
          pagesViewed,
          notesCreated,
          messagesSent,
          booksRead: uniqueFiles.length,
          bookTitles: uniqueFiles.slice(0, 5),
        }
      },
    }),

    getDailyReadingStats: tool({
      description: "Get daily page reading counts for charting over a time period",
      parameters: z.object({
        days: z.number().describe("Number of days to look back for daily stats"),
      }),
      execute: async ({ days }) => {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const { data: activity } = await supabase
          .from("activity_log")
          .select("created_at")
          .eq("user_id", userId)
          .eq("action_type", "page_viewed")
          .gte("created_at", startDate.toISOString())

        if (!activity) return { data: [] }

        // Group by day
        const dailyCounts: Record<string, number> = {}
        const now = new Date()

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split("T")[0]
          dailyCounts[dateStr] = 0
        }

        activity.forEach((a) => {
          const dateStr = new Date(a.created_at).toISOString().split("T")[0]
          if (dailyCounts[dateStr] !== undefined) {
            dailyCounts[dateStr]++
          }
        })

        return {
          data: Object.entries(dailyCounts).map(([date, pages]) => ({
            date,
            pages,
          })),
        }
      },
    }),

    getFriendNotes: tool({
      description: "Get sticky notes that friends have left in the user's files",
      parameters: z.object({
        limit: z.number().optional().describe("Maximum number of notes to return"),
      }),
      execute: async ({ limit = 10 }) => {
        // Get files the user owns
        const { data: files } = await supabase.from("files").select("id, title").eq("owner_id", userId)

        if (!files || files.length === 0) {
          return { found: false, message: "No files found." }
        }

        const fileIds = files.map((f) => f.id)
        const fileMap = Object.fromEntries(files.map((f) => [f.id, f.title]))

        // Get notes from others on these files
        const { data: notes } = await supabase
          .from("sticky_notes")
          .select(`
            *,
            author:profiles(username, display_name)
          `)
          .in("file_id", fileIds)
          .neq("author_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit)

        if (!notes || notes.length === 0) {
          return { found: false, message: "No friend notes found in your files." }
        }

        return {
          found: true,
          notes: notes.map((n) => ({
            content: n.content,
            author: n.author?.display_name || n.author?.username,
            page: n.page_number,
            fileTitle: fileMap[n.file_id],
            createdAt: n.created_at,
          })),
        }
      },
    }),

    getFriendProgress: tool({
      description: "Get a specific friend's reading progress on a shared book",
      parameters: z.object({
        friendUsername: z.string().describe("The friend's username to look up"),
        bookTitle: z.string().optional().describe("Optional book title to filter by"),
      }),
      execute: async ({ friendUsername, bookTitle }) => {
        // Find the friend
        const { data: friend } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .ilike("username", friendUsername)
          .single()

        if (!friend) {
          return { found: false, message: `Could not find user @${friendUsername}` }
        }

        // Get shared files
        const { data: userFiles } = await supabase.from("file_members").select("file_id").eq("user_id", userId)

        const { data: friendFiles } = await supabase.from("file_members").select("file_id").eq("user_id", friend.id)

        if (!userFiles || !friendFiles) {
          return { found: false, message: "No shared files found." }
        }

        const userFileIds = new Set(userFiles.map((f) => f.file_id))
        const sharedFileIds = friendFiles.filter((f) => userFileIds.has(f.file_id)).map((f) => f.file_id)

        if (sharedFileIds.length === 0) {
          return { found: false, message: `No shared books with @${friendUsername}` }
        }

        // Get friend's progress on shared files
        let progressQuery = supabase
          .from("reading_progress")
          .select(`
            *,
            file:files(title, total_pages)
          `)
          .eq("user_id", friend.id)
          .in("file_id", sharedFileIds)

        if (bookTitle) {
          const { data: matchingFile } = await supabase
            .from("files")
            .select("id")
            .ilike("title", `%${bookTitle}%`)
            .in("id", sharedFileIds)
            .single()

          if (matchingFile) {
            progressQuery = progressQuery.eq("file_id", matchingFile.id)
          }
        }

        const { data: progress } = await progressQuery

        if (!progress || progress.length === 0) {
          return {
            found: false,
            message: `@${friendUsername} hasn't started reading your shared books yet.`,
          }
        }

        return {
          found: true,
          friend: friend.display_name || friend.username,
          progress: progress.map((p) => ({
            bookTitle: p.file?.title,
            currentPage: p.current_page,
            totalPages: p.file?.total_pages,
            lastReadAt: p.last_read_at,
          })),
        }
      },
    }),

    getUserBooks: tool({
      description: "Get a list of all books/files in the user's library",
      parameters: z.object({}),
      execute: async () => {
        const { data: files } = await supabase
          .from("files")
          .select(`
            id, title, total_pages, created_at,
            progress:reading_progress(current_page, last_read_at)
          `)
          .or(`owner_id.eq.${userId},id.in.(select file_id from file_members where user_id = '${userId}')`)
          .order("created_at", { ascending: false })

        if (!files || files.length === 0) {
          return { found: false, message: "No books in your library yet." }
        }

        return {
          found: true,
          books: files.map((f) => {
            const userProgress = Array.isArray(f.progress)
              ? f.progress.find((p: { current_page?: number }) => p.current_page !== undefined)
              : f.progress
            return {
              title: f.title,
              totalPages: f.total_pages,
              currentPage: userProgress?.current_page || 0,
              lastReadAt: userProgress?.last_read_at,
            }
          }),
        }
      },
    }),
  }

  const systemPrompt = `You are Clurb AI, a helpful reading assistant for the Clurb social reading app. 
You help users understand their reading habits, find information about their books, and interact with their reading community.

You have access to tools that can query the user's reading data, activity, and social interactions.

When presenting data:
- Be conversational and friendly
- Use specific numbers and details when available
- Suggest ways to improve reading habits when appropriate
- When showing daily stats, format them nicely for display

The user's reading activity is logged automatically as they use the app, including pages viewed, notes created, and messages sent.`

  const result = streamText({
    model: "xai/grok-3-mini",
    system: systemPrompt,
    messages: convertToModelMessages(messages as UIMessage[]),
    tools,
    maxSteps: 5,
  })

  return result.toUIMessageStreamResponse()
}
