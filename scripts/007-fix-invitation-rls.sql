-- Fix RLS for file invitations - allow viewing file details for pending invitations

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view files they have pending invitations for" ON files;

-- Add policy to allow viewing files for which user has a pending invitation
CREATE POLICY "Users can view files they have pending invitations for"
  ON files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_invitations
      WHERE file_invitations.file_id = files.id
      AND file_invitations.to_user_id = auth.uid()
      AND file_invitations.status = 'pending'
    )
  );

-- Also ensure file owners can see their own files (should already exist but let's be safe)
DROP POLICY IF EXISTS "Users can view their own files" ON files;
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  USING (owner_id = auth.uid());

-- Users can view files they are members of (should already exist)
DROP POLICY IF EXISTS "Users can view files they are members of" ON files;
CREATE POLICY "Users can view files they are members of"
  ON files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_members
      WHERE file_members.file_id = files.id
      AND file_members.user_id = auth.uid()
    )
  );
