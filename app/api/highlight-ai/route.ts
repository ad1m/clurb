import { streamText, tool, convertToCoreMessages, type Message } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { files, highlights, activityLog } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { extractPdfPages } from "@/lib/local-storage"

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, fileId, pageNumber, selectedText } = await req.json()
  const auth = await getAuthUser()

  if (!auth) return new Response("Unauthorized", { status: 401 })

  // Look up the file to get fileUrl and title
  const file = db.select().from(files).where(and(eq(files.id, fileId), eq(files.ownerId, auth.id))).get()
  if (!file) return new Response("File not found", { status: 404 })

  // Log the highlight if there's selected text
  if (selectedText?.length > 0) {
    db.insert(highlights).values({
      id: crypto.randomUUID(),
      fileId,
      userId: auth.id,
      pageNumber: pageNumber || 1,
      highlightedText: selectedText,
      aiPrompt: messages[messages.length - 1]?.content || "",
    }).run()
  }

  // Log activity
  db.insert(activityLog).values({
    id: crypto.randomUUID(),
    userId: auth.id,
    fileId,
    actionType: "ai_highlight_query",
    metadata: JSON.stringify({ page: pageNumber, textLength: selectedText?.length || 0 }),
  }).run()

  const systemPrompt = `You are a reading assistant helping the user understand "${file.title}".
The user is currently on page ${pageNumber} of ${file.totalPages ?? "unknown"} total pages.
${selectedText?.length > 0 ? `\nThe user has selected this text from page ${pageNumber}:\n"""\n${selectedText}\n"""\nWhen the user says "this", "the text", or "the passage", they mean the selected text above.` : ""}

You have a tool called getPageContent that lets you read any page or range of pages from this document.
Use it proactively whenever the user asks about specific pages, chapters, characters, events, or content you don't already have.
Examples of when to use it:
- "Summarize page 3" → call getPageContent(3, 3)
- "Summarize pages 1-3" → call getPageContent(1, 3)
- "What happened in chapter 2?" → estimate the page range and call getPageContent
- "What were the key points from this chapter?" → call getPageContent for the current page range
- "Summarize this page" → call getPageContent(${pageNumber}, ${pageNumber})

Always read the actual content before answering questions about it. Format responses with markdown.`

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: convertToCoreMessages(messages as Message[]),
    maxSteps: 5,
    tools: {
      getPageContent: tool({
        description: `Read the text content of one or more pages from "${file.title}". Use this to answer any question about what's written in the document.`,
        parameters: z.object({
          startPage: z.number().int().min(1).describe("First page to read (1-indexed)"),
          endPage: z.number().int().min(1).describe("Last page to read — use the same as startPage for a single page. Keep ranges under 10 pages for best results."),
        }),
        execute: async ({ startPage, endPage }) => {
          const clampedEnd = Math.min(endPage, startPage + 9) // cap at 10 pages per call
          try {
            const text = await extractPdfPages(file.fileUrl, startPage, clampedEnd)
            return { success: true, pages: `${startPage}–${clampedEnd}`, content: text }
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : "Could not read page content" }
          }
        },
      }),
    },
  })

  return result.toDataStreamResponse()
}
