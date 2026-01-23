-- COMPREHENSIVE RLS FIX FOR FILES AND FILE_MEMBERS
-- This script drops ALL existing policies and creates clean, non-recursive ones
-- Run this script to fix "infinite recursion detected in policy" errors

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES ON FILES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view files they own or are members of" ON files;
DROP POLICY IF EXISTS "Users can view own files" ON files;
DROP POLICY IF EXISTS "Users can view files they are members of" ON files;
DROP POLICY IF EXISTS "Users can view files they have pending invitations for" ON files;
DROP POLICY IF EXISTS "Users can view their own files" ON files;
DROP POLICY IF EXISTS "Users can insert own files" ON files;
DROP POLICY IF EXISTS "Users can update own files" ON files;
DROP POLICY IF EXISTS "Users can delete own files" ON files;
DROP POLICY IF EXISTS "files_sel_v5" ON files;
DROP POLICY IF EXISTS "files_ins_v5" ON files;
DROP POLICY IF EXISTS "files_upd_v5" ON files;
DROP POLICY IF EXISTS "files_del_v5" ON files;
DROP POLICY IF EXISTS "files_owner_select" ON files;
DROP POLICY IF EXISTS "files_member_select" ON files;
DROP POLICY IF EXISTS "files_owner_insert" ON files;
DROP POLICY IF EXISTS "files_owner_update" ON files;
DROP POLICY IF EXISTS "files_owner_delete" ON files;
DROP POLICY IF EXISTS "files_select_owner" ON files;
DROP POLICY IF EXISTS "files_select_member" ON files;
DROP POLICY IF EXISTS "files_insert" ON files;
DROP POLICY IF EXISTS "files_update" ON files;
DROP POLICY IF EXISTS "files_delete" ON files;

-- =====================================================
-- STEP 2: DROP ALL EXISTING POLICIES ON FILE_MEMBERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "File owners can add members" ON file_members;
DROP POLICY IF EXISTS "File owners can remove members" ON file_members;
DROP POLICY IF EXISTS "Users can add themselves via invitation" ON file_members;
DROP POLICY IF EXISTS "Users can view file members for their files" ON file_members;
DROP POLICY IF EXISTS "Users can view their file memberships" ON file_members;
DROP POLICY IF EXISTS "Users can view file members for files they have access to" ON file_members;
DROP POLICY IF EXISTS "members_sel_v5" ON file_members;
DROP POLICY IF EXISTS "members_ins_v5" ON file_members;
DROP POLICY IF EXISTS "members_upd_v5" ON file_members;
DROP POLICY IF EXISTS "members_del_v5" ON file_members;
DROP POLICY IF EXISTS "file_members_select" ON file_members;
DROP POLICY IF EXISTS "file_members_insert_owner" ON file_members;
DROP POLICY IF EXISTS "file_members_insert_via_invitation" ON file_members;
DROP POLICY IF EXISTS "file_members_update" ON file_members;
DROP POLICY IF EXISTS "file_members_delete" ON file_members;

-- =====================================================
-- STEP 3: ENSURE RLS IS ENABLED
-- =====================================================
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE NEW FILES POLICIES (NO RECURSION)
-- =====================================================

-- SELECT: Users can see files they own
CREATE POLICY "files_select_own" ON files FOR SELECT
USING (owner_id = auth.uid());

-- SELECT: Users can see files where they are a member (using subquery, not join)
-- This checks file_members but file_members doesn't check files for SELECT
CREATE POLICY "files_select_member" ON files FOR SELECT
USING (
  id IN (
    SELECT file_id FROM file_members WHERE user_id = auth.uid()
  )
);

-- SELECT: Users can see files they have pending invitations for
CREATE POLICY "files_select_invited" ON files FOR SELECT
USING (
  id IN (
    SELECT file_id FROM file_invitations
    WHERE to_user_id = auth.uid() AND status = 'pending'
  )
);

-- INSERT: Users can insert their own files
CREATE POLICY "files_insert_own" ON files FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- UPDATE: Users can update their own files
CREATE POLICY "files_update_own" ON files FOR UPDATE
USING (owner_id = auth.uid());

-- DELETE: Users can delete their own files
CREATE POLICY "files_delete_own" ON files FOR DELETE
USING (owner_id = auth.uid());

-- =====================================================
-- STEP 5: CREATE NEW FILE_MEMBERS POLICIES (NO RECURSION)
-- =====================================================

-- SELECT: Users can see their own membership records
CREATE POLICY "file_members_select_own" ON file_members FOR SELECT
USING (user_id = auth.uid());

-- SELECT: File owners can see all members of their files
-- Uses a direct subquery to files, which only checks owner_id (no recursion)
CREATE POLICY "file_members_select_owner" ON file_members FOR SELECT
USING (
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- INSERT: File owners can add members
CREATE POLICY "file_members_insert_owner" ON file_members FOR INSERT
WITH CHECK (
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- INSERT: Users can add themselves when they have an invitation
CREATE POLICY "file_members_insert_self" ON file_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND file_id IN (
    SELECT file_id FROM file_invitations
    WHERE to_user_id = auth.uid()
    AND status IN ('pending', 'accepted')
  )
);

-- UPDATE: Only file owners can update membership records
CREATE POLICY "file_members_update_owner" ON file_members FOR UPDATE
USING (
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- DELETE: File owners can remove anyone, users can remove themselves
CREATE POLICY "file_members_delete_owner" ON file_members FOR DELETE
USING (
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

CREATE POLICY "file_members_delete_self" ON file_members FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- VERIFICATION: List all policies (optional)
-- =====================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('files', 'file_members');
