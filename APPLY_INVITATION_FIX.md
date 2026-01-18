# How to Fix File Invitations

Your file invitation feature is currently not working because of a database permission issue. Follow these steps to fix it:

## The Problem

- Bell icon shows notification count (e.g., "2")
- When you click the bell, it says "No pending invitations"
- This happens because the database won't let users see file details for invitations they haven't accepted yet

## The Solution

You need to run a SQL script to update your database permissions (RLS policies).

---

## Step-by-Step Fix

### 1. Open Supabase Dashboard

Go to your Supabase project at [supabase.com](https://supabase.com)

### 2. Open SQL Editor

- Click **"SQL Editor"** in the left sidebar
- Click **"New query"**

### 3. Copy the SQL Script

Copy the entire contents of the file:
```
scripts/007-fix-invitation-rls.sql
```

Or copy this directly:

```sql
-- Fix RLS for file invitations - allow viewing file details for pending invitations

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view files they have pending invitations for" ON files;

-- Add policy to allow viewing files for which user has a pending invitation
CREATE POLICY "Users can view files they have pending invitations for"
  ON files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_invitations
      WHERE file_invitations.file_id = files.id
      AND file_invitations.to_user_id = auth.uid()
      AND file_invitations.status = 'pending'
    )
  );

-- Also ensure file owners can see their own files (should already exist but let's be safe)
DROP POLICY IF EXISTS "Users can view their own files" ON files;
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  USING (owner_id = auth.uid());

-- Users can view files they are members of (should already exist)
DROP POLICY IF EXISTS "Users can view files they are members of" ON files;
CREATE POLICY "Users can view files they are members of"
  ON files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_members
      WHERE file_members.file_id = files.id
      AND file_members.user_id = auth.uid()
    )
  );
```

### 4. Paste and Run

- Paste the SQL into the editor
- Click **"Run"** (or press Cmd/Ctrl + Enter)

### 5. Verify Success

You should see a success message like:
```
Success. No rows returned
```

---

## Test It Works

1. Have a friend share a file with you (or use two browser windows)
2. Click the bell icon in the top navigation
3. You should now see the invitation with:
   - File cover image
   - File title
   - Who shared it with you
   - Accept (✓) and Decline (✗) buttons
4. Click Accept
5. File should appear in your library
6. You can now open it and see all features (chat, sticky notes, etc.)

---

## What This Fix Does

The SQL script adds a new permission rule (RLS policy) that says:

> "Users can view file details if they have a pending invitation for that file"

This allows the invitation panel to show you file information BEFORE you accept, so you can make an informed decision.

### Policies Added:

1. **View files with pending invitations** - NEW! This is the main fix
2. **View own files** - Ensures you can always see files you uploaded
3. **View files as member** - Ensures you can see files shared with you

---

## Troubleshooting

### "No pending invitations" still showing

- Make sure the SQL ran successfully (check for error messages)
- Try refreshing the page (Cmd/Ctrl + R)
- Make sure you ran the script in the correct Supabase project

### Error when running SQL

- Make sure you're logged in to Supabase
- Make sure you're in the correct project
- Try copying the SQL again in case there was a formatting issue

### Still not working?

1. Check your browser console for errors (F12 → Console tab)
2. Check that you have the latest code (git pull)
3. Make sure your `.env.local` has correct Supabase credentials

---

## After This Fix

File invitations will work perfectly:
- ✅ Share files with friends from the 3-dot menu
- ✅ Recipients see full invitation details in bell icon
- ✅ Accept/decline invitations
- ✅ Accepted files appear in library immediately
- ✅ Full access to chat, sticky notes, and reading together

---

**Need help?** Check the main README.md or SETUP.md files for more troubleshooting tips.
