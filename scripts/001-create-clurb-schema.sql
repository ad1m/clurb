-- Clurb Database Schema
-- Social reading app with files, friends, sticky notes, chat, and activity tracking

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files/Documents table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  cover_image_url TEXT,
  total_pages INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File sharing (friends who have access to a file)
CREATE TABLE file_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, user_id)
);

-- Reading progress tracking
CREATE TABLE reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_page INTEGER DEFAULT 1,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, user_id)
);

-- Sticky notes on pages
CREATE TABLE sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  position_x REAL DEFAULT 0.5,
  position_y REAL DEFAULT 0.5,
  color TEXT DEFAULT '#FBBF24',
  is_surprise BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages within files
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Text highlights for AI interactions
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  highlighted_text TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  ai_prompt TEXT,
  ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log for AI analytics
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friend relationships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Files RLS Policies
CREATE POLICY "Users can view files they own or are members of" ON files FOR SELECT 
  USING (owner_id = auth.uid() OR id IN (SELECT file_id FROM file_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own files" ON files FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own files" ON files FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own files" ON files FOR DELETE USING (auth.uid() = owner_id);

-- File Members RLS Policies
CREATE POLICY "Users can view file members for files they have access to" ON file_members FOR SELECT 
  USING (file_id IN (SELECT id FROM files WHERE owner_id = auth.uid()) OR user_id = auth.uid());
CREATE POLICY "File owners can add members" ON file_members FOR INSERT 
  WITH CHECK (file_id IN (SELECT id FROM files WHERE owner_id = auth.uid()));
CREATE POLICY "File owners can remove members" ON file_members FOR DELETE 
  USING (file_id IN (SELECT id FROM files WHERE owner_id = auth.uid()));

-- Reading Progress RLS Policies
CREATE POLICY "Users can view reading progress for files they have access to" ON reading_progress FOR SELECT 
  USING (file_id IN (SELECT id FROM files WHERE owner_id = auth.uid()) OR user_id = auth.uid() OR 
         file_id IN (SELECT file_id FROM file_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own reading progress" ON reading_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reading progress" ON reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sticky Notes RLS Policies
CREATE POLICY "Users can view sticky notes for files they have access to" ON sticky_notes FOR SELECT 
  USING (file_id IN (SELECT id FROM files WHERE owner_id = auth.uid()) OR 
         file_id IN (SELECT file_id FROM file_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert sticky notes for files they have access to" ON sticky_notes FOR INSERT 
  WITH CHECK (auth.uid() = author_id AND (file_id IN (SELECT id FROM files WHERE owner_id = auth.uid()) OR 
         file_id IN (SELECT file_id FROM file_members WHERE user_id = auth.uid())));
CREATE POLICY "Users can update own sticky notes" ON sticky_notes FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own sticky notes" ON sticky_notes FOR DELETE USING (auth.uid() = author_id);

-- Chat Messages RLS Policies
CREATE POLICY "Users can view chat messages for files they have access to" ON chat_messages FOR SELECT 
  USING (file_id IN (SELECT id FROM files WHERE owner_id = auth.uid()) OR 
         file_id IN (SELECT file_id FROM file_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert chat messages for files they have access to" ON chat_messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id AND (file_id IN (SELECT id FROM files WHERE owner_id = auth.uid()) OR 
         file_id IN (SELECT file_id FROM file_members WHERE user_id = auth.uid())));

-- Highlights RLS Policies
CREATE POLICY "Users can view own highlights" ON highlights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own highlights" ON highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own highlights" ON highlights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own highlights" ON highlights FOR DELETE USING (auth.uid() = user_id);

-- Activity Log RLS Policies
CREATE POLICY "Users can view own activity" ON activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Friendships RLS Policies
CREATE POLICY "Users can view own friendships" ON friendships FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update friendships involving them" ON friendships FOR UPDATE 
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can delete own friend requests" ON friendships FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_files_owner ON files(owner_id);
CREATE INDEX idx_file_members_file ON file_members(file_id);
CREATE INDEX idx_file_members_user ON file_members(user_id);
CREATE INDEX idx_reading_progress_file ON reading_progress(file_id);
CREATE INDEX idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX idx_sticky_notes_file ON sticky_notes(file_id);
CREATE INDEX idx_chat_messages_file ON chat_messages(file_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);
CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_friendships_friend ON friendships(friend_id);
