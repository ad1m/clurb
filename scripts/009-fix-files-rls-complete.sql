-- Complete fix for files table RLS policies
-- This script drops ALL existing policies and recreates them correctly

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'files';

-- Drop ALL existing policies on files table
DROP POLICY IF EXISTS "Users can view files they own or are members of" ON files;
DROP POLICY IF EXISTS "Users can view their own files" ON files;
DROP POLICY IF EXISTS "Users can view files they are members of" ON files;
DROP POLICY IF EXISTS "Users can view files they have pending invitations for" ON files;
DROP POLICY IF EXISTS "Users can insert own files" ON files;
DROP POLICY IF EXISTS "Users can update own files" ON files;
DROP POLICY IF EXISTS "Users can delete own files" ON files;

-- Recreate policies with correct logic
-- SELECT policy: Users can see files they own, are members of, OR have pending invitations for
CREATE POLICY "Users can view files they own or are members of"
  ON files FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT file_id FROM file_members WHERE user_id = auth.uid())
    OR id IN (SELECT file_id FROM file_invitations WHERE to_user_id = auth.uid() AND status = 'pending')
  );

-- INSERT policy: Users can only create their own files
CREATE POLICY "Users can insert own files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE policy: Only owners can update files
CREATE POLICY "Users can update own files"
  ON files FOR UPDATE
  USING (auth.uid() = owner_id);

-- DELETE policy: Only owners can delete files
CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  USING (auth.uid() = owner_id);

-- Verify the new policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'files'
ORDER BY policyname;
