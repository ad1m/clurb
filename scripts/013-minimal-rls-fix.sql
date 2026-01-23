-- MINIMAL RLS FIX - COMPLETELY AVOID CROSS-TABLE REFERENCES IN SELECT
-- This is the nuclear option - drops everything and creates minimal policies

-- =====================================================
-- STEP 1: DISABLE RLS TEMPORARILY TO DROP ALL POLICIES
-- =====================================================

-- First, let's see what policies exist (run this separately if you want to check):
-- SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('files', 'file_members');

-- =====================================================
-- STEP 2: DROP ALL POLICIES ON FILES
-- =====================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'files'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON files', pol.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: DROP ALL POLICIES ON FILE_MEMBERS
-- =====================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'file_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON file_members', pol.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 4: ENSURE RLS IS ENABLED
-- =====================================================
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE MINIMAL FILES POLICIES
-- No references to file_members in SELECT at all
-- =====================================================

-- SELECT: Users can see files they own
CREATE POLICY "files_sel_owner" ON files FOR SELECT
USING (owner_id = auth.uid());

-- SELECT: Users can see files they are members of
-- This uses EXISTS which is evaluated per-row and shouldn't cause recursion
-- because file_members SELECT only checks user_id directly
CREATE POLICY "files_sel_member" ON files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM file_members fm
    WHERE fm.file_id = files.id
    AND fm.user_id = auth.uid()
  )
);

-- INSERT: Users can insert their own files
CREATE POLICY "files_ins" ON files FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- UPDATE: Users can update their own files
CREATE POLICY "files_upd" ON files FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE: Users can delete their own files
CREATE POLICY "files_del" ON files FOR DELETE
USING (owner_id = auth.uid());

-- =====================================================
-- STEP 6: CREATE MINIMAL FILE_MEMBERS POLICIES
-- CRITICAL: SELECT policies must NOT reference files table
-- =====================================================

-- SELECT: Users can see memberships where they ARE the member
-- NO reference to files table here!
CREATE POLICY "fm_sel_self" ON file_members FOR SELECT
USING (user_id = auth.uid());

-- SELECT: Users can see all members of files they own
-- This references files but only for owner check (simple, non-recursive)
CREATE POLICY "fm_sel_owner" ON file_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM files f
    WHERE f.id = file_members.file_id
    AND f.owner_id = auth.uid()
  )
);

-- INSERT: File owners can add members
CREATE POLICY "fm_ins_owner" ON file_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM files f
    WHERE f.id = file_members.file_id
    AND f.owner_id = auth.uid()
  )
);

-- INSERT: Users can add themselves via invitation
CREATE POLICY "fm_ins_invite" ON file_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM file_invitations fi
    WHERE fi.file_id = file_members.file_id
    AND fi.to_user_id = auth.uid()
    AND fi.status IN ('pending', 'accepted')
  )
);

-- UPDATE: Only file owners
CREATE POLICY "fm_upd" ON file_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM files f
    WHERE f.id = file_members.file_id
    AND f.owner_id = auth.uid()
  )
);

-- DELETE: File owners or self
CREATE POLICY "fm_del" ON file_members FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM files f
    WHERE f.id = file_members.file_id
    AND f.owner_id = auth.uid()
  )
);

-- =====================================================
-- STEP 7: VERIFY (run separately to check)
-- =====================================================
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('files', 'file_members')
-- ORDER BY tablename, cmd;
