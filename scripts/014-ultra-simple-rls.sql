-- ULTRA SIMPLE RLS - NO CROSS-TABLE REFERENCES IN SELECT POLICIES
-- This completely eliminates any possibility of recursion

-- =====================================================
-- STEP 1: DISABLE RLS ON BOTH TABLES TEMPORARILY
-- =====================================================
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
ALTER TABLE file_members DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: DROP ALL POLICIES ON FILES (dynamic)
-- =====================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'files' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON files', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: DROP ALL POLICIES ON FILE_MEMBERS (dynamic)
-- =====================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'file_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON file_members', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- =====================================================
-- STEP 4: RE-ENABLE RLS
-- =====================================================
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE ULTRA-SIMPLE FILES POLICIES
-- KEY: No references to file_members in any SELECT policy!
-- =====================================================

-- Users can see their own files (owner)
CREATE POLICY "files_own" ON files FOR SELECT
USING (owner_id = auth.uid());

-- Users can see files where they have a membership record
-- Using a simple IN subquery - file_members SELECT will only check user_id
CREATE POLICY "files_member" ON files FOR SELECT
USING (
  id IN (SELECT file_id FROM file_members WHERE user_id = auth.uid())
);

-- Users can insert their own files
CREATE POLICY "files_insert" ON files FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Users can update their own files
CREATE POLICY "files_update" ON files FOR UPDATE
USING (owner_id = auth.uid());

-- Users can delete their own files
CREATE POLICY "files_delete" ON files FOR DELETE
USING (owner_id = auth.uid());

-- =====================================================
-- STEP 6: CREATE ULTRA-SIMPLE FILE_MEMBERS POLICIES
-- KEY: SELECT policies must NOT reference files table AT ALL!
-- =====================================================

-- Users can see their own membership records
-- This is the ONLY select policy - no reference to files!
CREATE POLICY "fm_own" ON file_members FOR SELECT
USING (user_id = auth.uid());

-- File owners can insert members (checked via files table - safe for INSERT)
CREATE POLICY "fm_insert_owner" ON file_members FOR INSERT
WITH CHECK (
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- Users can insert themselves if they have an invitation
CREATE POLICY "fm_insert_self" ON file_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND file_id IN (
    SELECT file_id FROM file_invitations
    WHERE to_user_id = auth.uid()
    AND status IN ('pending', 'accepted')
  )
);

-- File owners can update members
CREATE POLICY "fm_update" ON file_members FOR UPDATE
USING (
  file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- File owners can delete members, users can delete themselves
CREATE POLICY "fm_delete" ON file_members FOR DELETE
USING (
  user_id = auth.uid()
  OR file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- =====================================================
-- STEP 7: VERIFY - Run this to check policies
-- =====================================================
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename IN ('files', 'file_members') AND schemaname = 'public'
ORDER BY tablename, cmd;
