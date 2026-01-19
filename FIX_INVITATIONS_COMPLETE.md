# Complete Fix for File Invitations and PDF Viewing

This guide will fix both the PDF worker error and the file invitation system.

## Issues Being Fixed

1. **PDF Worker Error**: "Failed to resolve module specifier 'pdf.worker.mjs'"
2. **File Invitations Not Working**: Notifications show but invitations don't display or can't be accepted

## Part 1: Fix PDF Worker (Code Changes)

The code has been updated to use the legacy PDF.js worker build instead of ES modules.

### What Changed:
- **components/pdf-viewer.tsx**: Worker URL changed to CloudFlare CDN with `.js` file
- **components/file-card.tsx**: Worker URL changed to CloudFlare CDN with `.js` file

### Testing PDF Upload:
1. Pull the latest code changes
2. Restart your dev server (`npm run dev`)
3. Try uploading a PDF file
4. You should see the file preview generate and be able to click to view it
5. **No more errors** about DOMMatrix or pdf.worker.mjs

## Part 2: Fix File Invitations (Database Changes)

The invitation system requires fixing the RLS (Row Level Security) policies on the `files` table.

### Step-by-Step Instructions:

#### Step 1: Clean Up Existing Invitations

This gives us a fresh start without any corrupted invitation data.

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of: `scripts/008-cleanup-invitations.sql`
4. Click **Run**
5. Verify it returns `0` for remaining_invitations

#### Step 2: Fix Files RLS Policies

This is the critical fix that allows invitations to work properly.

1. In **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of: `scripts/009-fix-files-rls-complete.sql`
4. Click **Run**
5. You should see output showing the policies that were dropped and created

#### Step 3: Verify Policies Were Created

At the end of the script output, you should see 4 policies:

```
policyname                                    | cmd
--------------------------------------------- | ------
Users can delete own files                    | DELETE
Users can insert own files                    | INSERT
Users can update own files                    | UPDATE
Users can view files they own or are members of | SELECT
```

The critical policy is **"Users can view files they own or are members of"** which includes:
- Files you own
- Files you're a member of
- **Files you have pending invitations for** ← This was missing!

## Part 3: Test the Complete System

### Test PDF Upload and Viewing:

1. Navigate to Library page
2. Click "+" to upload a new PDF
3. Select a PDF file
4. **Expected**: File uploads successfully, preview generates, no errors
5. Click on the file card
6. **Expected**: PDF opens and displays correctly

### Test File Invitations:

#### Send an Invitation:

1. Upload a file or select existing file
2. Click the 3-dot menu → "Share with Friends"
3. Select a friend
4. Click "Send Invitations"
5. **Expected**: "Invitations sent successfully" message

#### Receive and Accept Invitation:

1. Log in as the friend who was invited
2. **Expected**: Notification bell shows a number badge
3. Click the notification bell
4. **Expected**: File invitation appears with:
   - File cover image
   - File title
   - Inviter's name
   - Accept/Decline buttons
5. Click "Accept"
6. **Expected**:
   - "Invitation accepted" message
   - Page refreshes
   - File now appears in your Library
7. Click on the file
8. **Expected**: You can view the PDF and see "Reading Together" shows both users

### Test Real-Time Features:

With two users in the same file:

1. **Presence Tracking**: "Reading Together" panel should show both users with green online indicators
2. **Chat**: Send a message from one user, it should appear immediately for the other user
3. **Sticky Notes**: Create a sticky note, it should appear for both users

## Troubleshooting

### If PDF upload still shows worker error:

1. Completely stop the dev server (Ctrl+C)
2. Clear Next.js cache: `rm -rf .next`
3. Restart: `npm run dev`
4. Try again

### If invitations still don't show up:

1. Check the browser console for errors
2. Look for `[v0]` prefixed console logs
3. Verify you ran BOTH SQL scripts (008 and 009)
4. Check that the policies were created by running:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'files';
   ```

### If invitation acceptance fails:

1. Open browser console
2. Look for `[v0] Processing invitation` logs
3. Check if there's an error about file_members or RLS
4. Make sure the file_members RLS policies exist:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'file_members';
   ```

## Expected Console Output

After fixes, when accepting an invitation you should see:

```
[v0] Processing invitation {invitation-id} action: accept for user: {user-id}
[v0] Found invitation: {invitation-object}
[v0] Updated invitation status
[v0] Checking for existing member...
[v0] Added user to file_members
[v0] Logged activity
```

## What If It Still Doesn't Work?

If you've followed all steps and it still doesn't work:

1. Export the errors from browser console
2. Check Supabase logs for RLS policy violations
3. Verify your `.env.local` has correct Supabase credentials
4. Make sure you're testing with different user accounts (not the same user)

---

**After completing these steps, your app should be fully functional with working PDF uploads, file invitations, and all social features!**
