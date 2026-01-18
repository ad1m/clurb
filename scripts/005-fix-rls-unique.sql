-- Fix RLS policies with unique names to avoid conflicts
-- First, disable RLS temporarily to allow all operations
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
ALTER TABLE file_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL possible policy names that might exist
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on files table
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'files' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON files', pol.policyname);
    END LOOP;
    
    -- Drop all policies on file_members table
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'file_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON file_members', pol.policyname);
    END LOOP;
END $$;

-- Create or replace helper function to check file ownership without recursion
CREATE OR REPLACE FUNCTION is_file_owner(file_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM files WHERE id = file_id AND owner_id = auth.uid()
  );
$$;

-- Create or replace helper function to check file membership without recursion  
CREATE OR REPLACE FUNCTION is_file_member(file_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM file_members WHERE file_id = is_file_member.file_id AND user_id = auth.uid()
  );
$$;

-- Re-enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_members ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique timestamp-based names
-- FILES TABLE POLICIES
CREATE POLICY "files_sel_v5" ON files FOR SELECT USING (
  owner_id = auth.uid() OR is_file_member(id)
);

CREATE POLICY "files_ins_v5" ON files FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);

CREATE POLICY "files_upd_v5" ON files FOR UPDATE USING (
  owner_id = auth.uid()
);

CREATE POLICY "files_del_v5" ON files FOR DELETE USING (
  owner_id = auth.uid()
);

-- FILE_MEMBERS TABLE POLICIES
CREATE POLICY "members_sel_v5" ON file_members FOR SELECT USING (
  user_id = auth.uid() OR is_file_owner(file_id)
);

CREATE POLICY "members_ins_v5" ON file_members FOR INSERT WITH CHECK (
  is_file_owner(file_id)
);

CREATE POLICY "members_upd_v5" ON file_members FOR UPDATE USING (
  is_file_owner(file_id)
);

CREATE POLICY "members_del_v5" ON file_members FOR DELETE USING (
  is_file_owner(file_id) OR user_id = auth.uid()
);
