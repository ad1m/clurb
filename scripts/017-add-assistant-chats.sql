-- Assistant Chat History Schema (for reading AI assistant)
-- Run this script in your Supabase SQL Editor

-- Create assistant_chats table to store chat sessions linked to files
CREATE TABLE IF NOT EXISTS assistant_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  highlighted_text TEXT, -- Optional: the text that started this chat
  page_number INTEGER, -- Optional: page where chat started
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create assistant_messages table to store messages within chats
CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES assistant_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistant_chats_user_id ON assistant_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_chats_file_id ON assistant_chats(file_id);
CREATE INDEX IF NOT EXISTS idx_assistant_chats_updated_at ON assistant_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_chat_id ON assistant_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created_at ON assistant_messages(created_at);

-- Enable RLS
ALTER TABLE assistant_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assistant_chats
-- Users can access chats for files they have access to (through file_members)
CREATE POLICY "assistant_chats_select" ON assistant_chats FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "assistant_chats_insert" ON assistant_chats FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "assistant_chats_update" ON assistant_chats FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "assistant_chats_delete" ON assistant_chats FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for assistant_messages
-- Users can only access messages in their own chats
CREATE POLICY "assistant_messages_select" ON assistant_messages FOR SELECT
USING (chat_id IN (SELECT id FROM assistant_chats WHERE user_id = auth.uid()));

CREATE POLICY "assistant_messages_insert" ON assistant_messages FOR INSERT
WITH CHECK (chat_id IN (SELECT id FROM assistant_chats WHERE user_id = auth.uid()));

CREATE POLICY "assistant_messages_delete" ON assistant_messages FOR DELETE
USING (chat_id IN (SELECT id FROM assistant_chats WHERE user_id = auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assistant_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assistant_chats SET updated_at = NOW() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update chat's updated_at when new message is added
DROP TRIGGER IF EXISTS trigger_update_assistant_chat_updated_at ON assistant_messages;
CREATE TRIGGER trigger_update_assistant_chat_updated_at
AFTER INSERT ON assistant_messages
FOR EACH ROW
EXECUTE FUNCTION update_assistant_chat_updated_at();
