-- Fix RLS for file_members to allow users to add themselves when accepting invitations

-- Drop existing INSERT policies on file_members
DROP POLICY IF EXISTS "File owners can add members" ON file_members;
DROP POLICY IF EXISTS "members_ins_v5" ON file_members;
DROP POLICY IF EXISTS "Users can add themselves via invitation" ON file_members;

-- Create policy allowing file owners to add any member
CREATE POLICY "File owners can add members" ON file_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM files
    WHERE files.id = file_members.file_id
    AND files.owner_id = auth.uid()
  )
);

-- Create policy allowing users to add THEMSELVES as a member
-- when they have an accepted invitation
CREATE POLICY "Users can add themselves via invitation" ON file_members FOR INSERT
WITH CHECK (
  -- User can only add themselves
  file_members.user_id = auth.uid()
  AND
  -- And they must have an accepted or pending invitation for this file
  EXISTS (
    SELECT 1 FROM file_invitations
    WHERE file_invitations.file_id = file_members.file_id
    AND file_invitations.to_user_id = auth.uid()
    AND file_invitations.status IN ('pending', 'accepted')
  )
);

-- Also ensure users can view the file_members records they're part of
DROP POLICY IF EXISTS "Users can view file members for their files" ON file_members;
CREATE POLICY "Users can view file members for their files" ON file_members FOR SELECT
USING (
  -- User is a member of this file
  EXISTS (
    SELECT 1 FROM file_members fm
    WHERE fm.file_id = file_members.file_id
    AND fm.user_id = auth.uid()
  )
  OR
  -- User owns the file
  EXISTS (
    SELECT 1 FROM files
    WHERE files.id = file_members.file_id
    AND files.owner_id = auth.uid()
  )
);
