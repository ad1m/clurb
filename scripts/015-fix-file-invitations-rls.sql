-- Fix RLS for file_invitations table
-- This ensures users can see and respond to invitations

-- Drop existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'file_invitations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON file_invitations', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE file_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see invitations sent TO them
CREATE POLICY "fi_select_recipient" ON file_invitations FOR SELECT
USING (to_user_id = auth.uid());

-- SELECT: Users can see invitations they sent (FROM them)
CREATE POLICY "fi_select_sender" ON file_invitations FOR SELECT
USING (from_user_id = auth.uid());

-- INSERT: File owners can create invitations
CREATE POLICY "fi_insert" ON file_invitations FOR INSERT
WITH CHECK (
  from_user_id = auth.uid()
  AND file_id IN (SELECT id FROM files WHERE owner_id = auth.uid())
);

-- UPDATE: Recipients can update (accept/decline) their invitations
CREATE POLICY "fi_update" ON file_invitations FOR UPDATE
USING (to_user_id = auth.uid());

-- DELETE: Senders can delete pending invitations
CREATE POLICY "fi_delete" ON file_invitations FOR DELETE
USING (from_user_id = auth.uid() AND status = 'pending');

-- Verify
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename = 'file_invitations' AND schemaname = 'public';
