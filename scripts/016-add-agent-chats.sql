-- Agent Chat History Schema
-- Run this script in your Supabase SQL Editor

-- Create agent_chats table to store chat sessions
CREATE TABLE IF NOT EXISTS agent_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create agent_messages table to store messages within chats
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES agent_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_chats_user_id ON agent_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_chats_updated_at ON agent_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_messages_chat_id ON agent_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at);

-- Enable RLS
ALTER TABLE agent_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_chats
-- Users can only access their own chats
CREATE POLICY "agent_chats_select" ON agent_chats FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "agent_chats_insert" ON agent_chats FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "agent_chats_update" ON agent_chats FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "agent_chats_delete" ON agent_chats FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for agent_messages
-- Users can only access messages in their own chats
CREATE POLICY "agent_messages_select" ON agent_messages FOR SELECT
USING (chat_id IN (SELECT id FROM agent_chats WHERE user_id = auth.uid()));

CREATE POLICY "agent_messages_insert" ON agent_messages FOR INSERT
WITH CHECK (chat_id IN (SELECT id FROM agent_chats WHERE user_id = auth.uid()));

CREATE POLICY "agent_messages_delete" ON agent_messages FOR DELETE
USING (chat_id IN (SELECT id FROM agent_chats WHERE user_id = auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_chats SET updated_at = NOW() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update chat's updated_at when new message is added
DROP TRIGGER IF EXISTS trigger_update_agent_chat_updated_at ON agent_messages;
CREATE TRIGGER trigger_update_agent_chat_updated_at
AFTER INSERT ON agent_messages
FOR EACH ROW
EXECUTE FUNCTION update_agent_chat_updated_at();
