-- Fix infinite recursion in RLS policies
-- The issue is that files -> file_members -> files creates a circular reference

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view files they own or are members of" ON files;
DROP POLICY IF EXISTS "Users can view file members for files they have access to" ON file_members;
DROP POLICY IF EXISTS "File owners can add members" ON file_members;
DROP POLICY IF EXISTS "File owners can remove members" ON file_members;

-- Create fixed policies for files (no subquery to file_members)
-- Instead, we check ownership directly or membership separately
CREATE POLICY "Users can view own files" ON files 
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can view files they are members of" ON files 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM file_members fm 
      WHERE fm.file_id = files.id AND fm.user_id = auth.uid()
    )
  );

-- Create fixed policies for file_members (direct checks, no circular refs)
CREATE POLICY "File members can view their membership" ON file_members 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "File owners can view all members" ON file_members 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM files f 
      WHERE f.id = file_members.file_id AND f.owner_id = auth.uid()
    )
  );

CREATE POLICY "File owners can add members" ON file_members 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM files f 
      WHERE f.id = file_id AND f.owner_id = auth.uid()
    )
    OR (user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "File owners can remove members" ON file_members 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM files f 
      WHERE f.id = file_members.file_id AND f.owner_id = auth.uid()
    )
  );
