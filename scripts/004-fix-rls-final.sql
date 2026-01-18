-- First, disable RLS temporarily to clean up
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
ALTER TABLE file_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL possible policy names that might exist
DROP POLICY IF EXISTS "Users can view own files" ON files;
DROP POLICY IF EXISTS "Users can view shared files" ON files;
DROP POLICY IF EXISTS "Users can insert own files" ON files;
DROP POLICY IF EXISTS "Users can update own files" ON files;
DROP POLICY IF EXISTS "Users can delete own files" ON files;
DROP POLICY IF EXISTS "files_select_owner" ON files;
DROP POLICY IF EXISTS "files_select_member" ON files;
DROP POLICY IF EXISTS "files_insert" ON files;
DROP POLICY IF EXISTS "files_update" ON files;
DROP POLICY IF EXISTS "files_delete" ON files;

DROP POLICY IF EXISTS "Users can view file memberships" ON file_members;
DROP POLICY IF EXISTS "File owners can manage members" ON file_members;
DROP POLICY IF EXISTS "file_members_select" ON file_members;
DROP POLICY IF EXISTS "file_members_insert" ON file_members;
DROP POLICY IF EXISTS "file_members_update" ON file_members;
DROP POLICY IF EXISTS "file_members_delete" ON file_members;

-- Drop helper functions if they exist
DROP FUNCTION IF EXISTS is_file_owner(uuid);
DROP FUNCTION IF EXISTS is_file_member(uuid);

-- Create helper functions with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_file_owner(file_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM files 
    WHERE id = file_id 
    AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_file_member(file_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM file_members 
    WHERE file_id = is_file_member.file_id 
    AND user_id = auth.uid()
  );
$$;

-- Re-enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_members ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for files
CREATE POLICY "files_owner_select" ON files
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "files_member_select" ON files
  FOR SELECT USING (
    id IN (SELECT file_id FROM file_members WHERE user_id = auth.uid())
  );

CREATE POLICY "files_owner_insert" ON files
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "files_owner_update" ON files
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "files_owner_delete" ON files
  FOR DELETE USING (owner_id = auth.uid());

-- Create simple policies for file_members
-- Users can see memberships for files they own or are members of
CREATE POLICY "file_members_own_select" ON file_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "file_members_owner_select" ON file_members
  FOR SELECT USING (
    file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
  );

-- Only file owners can insert/update/delete members
CREATE POLICY "file_members_owner_insert" ON file_members
  FOR INSERT WITH CHECK (
    file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
  );

CREATE POLICY "file_members_owner_update" ON file_members
  FOR UPDATE USING (
    file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
  );

CREATE POLICY "file_members_owner_delete" ON file_members
  FOR DELETE USING (
    file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
  );
