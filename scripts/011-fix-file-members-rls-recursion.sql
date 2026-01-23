-- Fix infinite recursion in file_members RLS policies
-- The previous policy referenced file_members within its own SELECT check, causing recursion

-- Drop ALL existing policies on file_members to start fresh
DROP POLICY IF EXISTS "File owners can add members" ON file_members;
DROP POLICY IF EXISTS "File owners can remove members" ON file_members;
DROP POLICY IF EXISTS "Users can add themselves via invitation" ON file_members;
DROP POLICY IF EXISTS "Users can view file members for their files" ON file_members;
DROP POLICY IF EXISTS "Users can view their file memberships" ON file_members;
DROP POLICY IF EXISTS "members_sel_v5" ON file_members;
DROP POLICY IF EXISTS "members_ins_v5" ON file_members;
DROP POLICY IF EXISTS "members_upd_v5" ON file_members;
DROP POLICY IF EXISTS "members_del_v5" ON file_members;

-- Ensure RLS is enabled
ALTER TABLE file_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see memberships where they are a member OR they own the file
-- Using a simple check that doesn't cause recursion
CREATE POLICY "file_members_select" ON file_members FOR SELECT
USING (
  -- User is this member
  user_id = auth.uid()
  OR
  -- User owns the file (check files table, not file_members)
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- INSERT: File owners can add any member
CREATE POLICY "file_members_insert_owner" ON file_members FOR INSERT
WITH CHECK (
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- INSERT: Users can add themselves when they have an invitation
CREATE POLICY "file_members_insert_via_invitation" ON file_members FOR INSERT
WITH CHECK (
  -- User can only add themselves
  user_id = auth.uid()
  AND
  -- They have an invitation for this file
  file_id IN (
    SELECT file_id FROM file_invitations
    WHERE to_user_id = auth.uid()
    AND status IN ('pending', 'accepted')
  )
);

-- UPDATE: Only file owners can update member records
CREATE POLICY "file_members_update" ON file_members FOR UPDATE
USING (
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- DELETE: File owners can remove members, and users can remove themselves
CREATE POLICY "file_members_delete" ON file_members FOR DELETE
USING (
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
  OR
  user_id = auth.uid()
);
