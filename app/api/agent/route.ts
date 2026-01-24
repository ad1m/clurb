import { streamText, tool, convertToCoreMessages, type Message } from "ai"
import { xai } from "@ai-sdk/xai"
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
      description: "Get a list of all books/files in the user's library with their reading progress",
      parameters: z.object({}),
      execute: async () => {
        // First get file IDs where user is owner or member
        const { data: memberFiles } = await supabase
          .from("file_members")
          .select("file_id")
          .eq("user_id", userId)

        const { data: ownedFiles } = await supabase
          .from("files")
          .select("id")
          .eq("owner_id", userId)

        const allFileIds = [
          ...(memberFiles?.map(f => f.file_id) || []),
          ...(ownedFiles?.map(f => f.id) || [])
        ]
        const uniqueFileIds = [...new Set(allFileIds)]

        if (uniqueFileIds.length === 0) {
          return { found: false, message: "No books in your library yet." }
        }

        // Get files with progress
        const { data: files } = await supabase
          .from("files")
          .select("id, title, total_pages, created_at")
          .in("id", uniqueFileIds)
          .order("created_at", { ascending: false })

        if (!files || files.length === 0) {
          return { found: false, message: "No books in your library yet." }
        }

        // Get reading progress for these files
        const { data: progressData } = await supabase
          .from("reading_progress")
          .select("file_id, current_page, last_read_at")
          .eq("user_id", userId)
          .in("file_id", uniqueFileIds)

        const progressMap = new Map(progressData?.map(p => [p.file_id, p]) || [])

        return {
          found: true,
          count: files.length,
          books: files.map((f) => {
            const progress = progressMap.get(f.id)
            return {
              title: f.title,
              totalPages: f.total_pages,
              currentPage: progress?.current_page || 0,
              lastReadAt: progress?.last_read_at || null,
              percentComplete: f.total_pages > 0 ? Math.round(((progress?.current_page || 0) / f.total_pages) * 100) : 0,
            }
          }),
        }
      },
    }),

    getBookProgress: tool({
      description: "Get the user's reading progress for a specific book by title",
      parameters: z.object({
        bookTitle: z.string().describe("The title or partial title of the book to look up"),
      }),
      execute: async ({ bookTitle }) => {
        // Find the book by title (case-insensitive partial match)
        const { data: files } = await supabase
          .from("files")
          .select("id, title, total_pages")
          .ilike("title", `%${bookTitle}%`)
          .limit(5)

        if (!files || files.length === 0) {
          return { found: false, message: `Could not find a book matching "${bookTitle}" in your library.` }
        }

        // Get reading progress for matched files
        const fileIds = files.map(f => f.id)
        const { data: progressData } = await supabase
          .from("reading_progress")
          .select("file_id, current_page, last_read_at")
          .eq("user_id", userId)
          .in("file_id", fileIds)

        const progressMap = new Map(progressData?.map(p => [p.file_id, p]) || [])

        const results = files.map(f => {
          const progress = progressMap.get(f.id)
          return {
            title: f.title,
            totalPages: f.total_pages,
            currentPage: progress?.current_page || 0,
            lastReadAt: progress?.last_read_at || null,
            percentComplete: f.total_pages > 0 ? Math.round(((progress?.current_page || 0) / f.total_pages) * 100) : 0,
            hasStarted: !!progress,
          }
        })

        return {
          found: true,
          searchQuery: bookTitle,
          matchCount: results.length,
          books: results,
        }
      },
    }),

    getFriendsReadingBook: tool({
      description: "Find which friends are also reading a specific book",
      parameters: z.object({
        bookTitle: z.string().describe("The title or partial title of the book"),
      }),
      execute: async ({ bookTitle }) => {
        // Find the book
        const { data: files } = await supabase
          .from("files")
          .select("id, title")
          .ilike("title", `%${bookTitle}%`)
          .limit(1)
          .single()

        if (!files) {
          return { found: false, message: `Could not find a book matching "${bookTitle}".` }
        }

        // Get all members of this file (excluding the user)
        const { data: members } = await supabase
          .from("file_members")
          .select(`
            user_id,
            user:profiles(username, display_name)
          `)
          .eq("file_id", files.id)
          .neq("user_id", userId)

        if (!members || members.length === 0) {
          return { found: true, bookTitle: files.title, friends: [], message: "No friends are reading this book yet." }
        }

        // Get their reading progress
        const memberIds = members.map(m => m.user_id)
        const { data: progressData } = await supabase
          .from("reading_progress")
          .select("user_id, current_page, last_read_at")
          .eq("file_id", files.id)
          .in("user_id", memberIds)

        const progressMap = new Map(progressData?.map(p => [p.user_id, p]) || [])

        const friendsReading = members.map(m => {
          const progress = progressMap.get(m.user_id)
          // Supabase returns single relation as object, but TS thinks it's array
          const userProfile = m.user as unknown as { username: string; display_name: string | null } | null
          return {
            username: userProfile?.username,
            displayName: userProfile?.display_name || userProfile?.username,
            currentPage: progress?.current_page || 0,
            lastReadAt: progress?.last_read_at,
          }
        })

        return {
          found: true,
          bookTitle: files.title,
          friendCount: friendsReading.length,
          friends: friendsReading,
        }
      },
    }),

    getUserFriends: tool({
      description: "Get a list of the user's friends",
      parameters: z.object({}),
      execute: async () => {
        const { data: friendships } = await supabase
          .from("friendships")
          .select(`
            user_id,
            friend_id,
            user:profiles!friendships_user_id_fkey(username, display_name),
            friend:profiles!friendships_friend_id_fkey(username, display_name)
          `)
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .eq("status", "accepted")

        if (!friendships || friendships.length === 0) {
          return { found: false, message: "You don't have any friends added yet." }
        }

        const friends = friendships.map(f => {
          const isFriend = f.user_id === userId
          // Supabase returns single relation as object, but TS thinks it's array
          const friendProfile = (isFriend ? f.friend : f.user) as unknown as { username: string; display_name: string | null } | null
          return {
            username: friendProfile?.username,
            displayName: friendProfile?.display_name || friendProfile?.username,
          }
        })

        return {
          found: true,
          count: friends.length,
          friends,
        }
      },
    }),
  }

  const systemPrompt = `You are Clurb AI, a helpful reading assistant for the Clurb social reading app.
You help users understand their reading habits, find information about their books, and interact with their reading community.

You have access to these tools:
- getUserBooks: Get all books in the user's library with reading progress
- getBookProgress: Get progress for a specific book by title
- getLastReadBook: Get the most recently read book
- getReadingActivity: Get reading activity summary for a time period
- getDailyReadingStats: Get daily page counts for charts
- getFriendNotes: Get notes friends left in user's files
- getFriendProgress: Get a friend's progress on a shared book
- getFriendsReadingBook: Find friends reading a specific book
- getUserFriends: Get list of user's friends

IMPORTANT INSTRUCTIONS:
- When asked about a specific book, use getBookProgress with the book title
- When asked "what books do I have", use getUserBooks
- When asked about reading activity, use getReadingActivity
- When asked about charts or visualizations, use getDailyReadingStats
- When asked about friends reading something, use getFriendsReadingBook

Be conversational and friendly. Use specific numbers and page counts when available.
Keep responses concise and helpful. Don't explain what tools you're using - just provide the answer.`

  const result = streamText({
    model: xai("grok-3-mini"),
    system: systemPrompt,
    messages: convertToCoreMessages(messages as Message[]),
    tools,
    maxSteps: 5,
  })

  return result.toDataStreamResponse()
}
