import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, fileId, pageNumber, selectedText } = await req.json()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Log the highlight interaction
  await supabase.from("highlights").insert({
    file_id: fileId,
    user_id: user.id,
    page_number: pageNumber,
    highlighted_text: selectedText,
    ai_prompt: messages[messages.length - 1]?.content || "",
  })

  // Log activity
  await supabase.from("activity_log").insert({
    user_id: user.id,
    file_id: fileId,
    action_type: "ai_highlight_query",
    metadata: { page: pageNumber, text_length: selectedText.length },
  })

  const systemPrompt = `You are a helpful reading assistant. The user has highlighted a passage from a document they are reading and wants help understanding or analyzing it. 
Be concise but thorough in your explanations. If asked to visualize or create an image description, provide a detailed description that could be used to generate an image.`

  const result = streamText({
    model: "xai/grok-3-mini",
    system: systemPrompt,
    messages: convertToModelMessages(messages as UIMessage[]),
  })

  return result.toUIMessageStreamResponse()
}
