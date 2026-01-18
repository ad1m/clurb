-- Create file_invitations table for sharing files with friends
CREATE TABLE IF NOT EXISTS file_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(file_id, to_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_invitations_file_id ON file_invitations(file_id);
CREATE INDEX IF NOT EXISTS idx_file_invitations_to_user_id ON file_invitations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_file_invitations_status ON file_invitations(status);

-- Enable RLS
ALTER TABLE file_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for file_invitations
CREATE POLICY "Users can view invitations sent to them"
  ON file_invitations FOR SELECT
  USING (to_user_id = auth.uid());

CREATE POLICY "Users can view invitations they sent"
  ON file_invitations FOR SELECT
  USING (from_user_id = auth.uid());

CREATE POLICY "File owners can create invitations"
  ON file_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM files 
      WHERE files.id = file_invitations.file_id 
      AND files.owner_id = auth.uid()
    )
  );

CREATE POLICY "Invitation recipients can update their invitations"
  ON file_invitations FOR UPDATE
  USING (to_user_id = auth.uid());

CREATE POLICY "Senders can delete pending invitations they sent"
  ON file_invitations FOR DELETE
  USING (from_user_id = auth.uid() AND status = 'pending');
