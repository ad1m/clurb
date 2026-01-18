-- Drop ALL existing policies on files and file_members to start fresh
DROP POLICY IF EXISTS "Users can view own files" ON files;
DROP POLICY IF EXISTS "Users can view files they own" ON files;
DROP POLICY IF EXISTS "Users can view files they're members of" ON files;
DROP POLICY IF EXISTS "Users can insert own files" ON files;
DROP POLICY IF EXISTS "Users can update own files" ON files;
DROP POLICY IF EXISTS "Users can delete own files" ON files;
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

DROP POLICY IF EXISTS "Users can view file memberships" ON file_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON file_members;
DROP POLICY IF EXISTS "File owners can manage members" ON file_members;
DROP POLICY IF EXISTS "File owners can insert members" ON file_members;
DROP POLICY IF EXISTS "File owners can delete members" ON file_members;
DROP POLICY IF EXISTS "file_members_select_policy" ON file_members;
DROP POLICY IF EXISTS "file_members_insert_policy" ON file_members;
DROP POLICY IF EXISTS "file_members_delete_policy" ON file_members;

-- Create a security definer function to check file membership without recursion
CREATE OR REPLACE FUNCTION is_file_member(check_file_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM file_members 
    WHERE file_id = check_file_id AND user_id = check_user_id
  );
$$;

-- Create a security definer function to check file ownership without recursion  
CREATE OR REPLACE FUNCTION is_file_owner(check_file_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM files 
    WHERE id = check_file_id AND owner_id = check_user_id
  );
$$;

-- FILES POLICIES (using security definer functions to avoid recursion)
CREATE POLICY "files_select_owner" ON files
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "files_select_member" ON files
  FOR SELECT USING (is_file_member(id, auth.uid()));

CREATE POLICY "files_insert" ON files
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "files_update" ON files
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "files_delete" ON files
  FOR DELETE USING (owner_id = auth.uid());

-- FILE_MEMBERS POLICIES (using security definer functions to avoid recursion)
CREATE POLICY "file_members_select_own" ON file_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "file_members_select_as_owner" ON file_members
  FOR SELECT USING (is_file_owner(file_id, auth.uid()));

CREATE POLICY "file_members_insert" ON file_members
  FOR INSERT WITH CHECK (is_file_owner(file_id, auth.uid()));

CREATE POLICY "file_members_delete" ON file_members
  FOR DELETE USING (is_file_owner(file_id, auth.uid()));
