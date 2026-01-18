-- Clean up all file invitations to start fresh
-- Run this to reset the invitation system

-- Delete all existing invitations
DELETE FROM file_invitations;

-- Verify cleanup
SELECT COUNT(*) as remaining_invitations FROM file_invitations;

-- This should return 0
