import { streamText, convertToCoreMessages, type Message } from "ai"
import { xai } from "@ai-sdk/xai"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, fileId, pageNumber, selectedText, chatId } = await req.json()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Log the highlight interaction (only if we have highlighted text)
  if (selectedText && selectedText.length > 0) {
    await supabase.from("highlights").insert({
      file_id: fileId,
      user_id: user.id,
      page_number: pageNumber,
      highlighted_text: selectedText,
      ai_prompt: messages[messages.length - 1]?.content || "",
    })
  }

  // Log activity
  await supabase.from("activity_log").insert({
    user_id: user.id,
    file_id: fileId,
    action_type: "ai_highlight_query",
    metadata: { page: pageNumber, text_length: selectedText?.length || 0, chat_id: chatId },
  })

  // Build system prompt with context about the highlighted text
  let systemPrompt = `You are a helpful reading assistant for Clurb, a social reading app. Help users understand and analyze what they're reading.
Be concise but thorough in your explanations. If asked to visualize or create an image description, provide a detailed description that could be used to generate an image.`

  if (selectedText && selectedText.length > 0) {
    systemPrompt += `

IMPORTANT CONTEXT - The user has highlighted the following passage from page ${pageNumber} of their document:

"""
${selectedText}
"""

When answering questions, always consider this highlighted passage as the primary context. If the user asks about "this" or "the text" or "the passage", they are referring to the highlighted text above.`
  }

  const result = streamText({
    model: xai("grok-3-mini"),
    system: systemPrompt,
    messages: convertToCoreMessages(messages as Message[]),
  })

  return result.toDataStreamResponse()
}
