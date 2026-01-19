# Complete Fix Guide for PDF Worker and File Invitations

This guide contains all the steps needed to fix both the PDF worker error and file invitation system.

## Critical Issues Being Fixed

1. **PDF Worker Error**: "Failed to resolve module specifier 'pdf.worker.mjs'"
2. **PDF Files Not Uploading**: Files upload but cannot be viewed
3. **File Invitations Not Working**: RLS policies preventing invitation display

---

## Part 1: Install Dependencies and Clear Cache

These steps are **CRITICAL**. The fix won't work without them.

### Step 1: Pull Latest Code

```bash
cd ~/Desktop/clurb
git pull
```

### Step 2: Install New Dependencies

We've added `pdfjs-dist` as a direct dependency to better control worker configuration.

```bash
npm install
```

**Expected output**: Should see pdfjs-dist@4.9.155 being installed

### Step 3: Clear Next.js Cache

This is **CRITICAL**. Old cached bundles contain the broken worker configuration.

```bash
rm -rf .next
rm -rf node_modules/.cache
```

### Step 4: Restart Development Server

```bash
npm run dev
```

**Wait for** the message:
```
✓ Compiled in [time]
✓ Ready on http://localhost:3000
```

---

## Part 2: Test PDF Upload and Viewing

### Test 1: Upload a PDF

1. Navigate to **http://localhost:3000**
2. Log in to your account
3. Go to **Library** page
4. Click the **"+"** button to upload a file
5. Select a PDF file from your computer
6. Click upload

### Expected Results:

✅ **File uploads successfully** without errors
✅ **Console shows**: `[v0] PDF.js worker configured globally: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.js`
✅ **File card appears** in library with cover preview generating
✅ **NO error** about "Failed to resolve module specifier"

### Test 2: View the PDF

1. Click on the uploaded file card
2. PDF should open in the reader view

### Expected Results:

✅ **PDF loads and displays correctly**
✅ **Console shows**: `[v0] PDF loaded successfully, pages: [number]`
✅ **Console shows**: `[v0] PDF page rendered successfully`
✅ **Can navigate** between pages using arrows
✅ **Can zoom** in and out

### If PDF Upload Still Fails:

Check the browser console for errors. You should see:

```
[v0] PDF.js worker configured globally: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.js
```

If you DON'T see this message, the PDFSetupProvider didn't run. Try:

1. Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)
2. Clear browser cache completely
3. Restart the dev server

---

## Part 3: Fix File Invitations (Database Changes)

The invitation system requires RLS policy fixes in your Supabase database.

### Step 1: Clean Up Existing Invitations

This gives us a fresh start.

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of: `scripts/008-cleanup-invitations.sql`
4. Paste into the SQL Editor
5. Click **Run**

**Expected output**: Should show `0` for `remaining_invitations`

### Step 2: Fix Files RLS Policies

This is the **CRITICAL FIX** that allows invitations to work.

1. In **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of: `scripts/009-fix-files-rls-complete.sql`
4. Paste into the SQL Editor
5. Click **Run**

**Expected output**: At the end you should see a table showing 4 policies:

```
policyname                                       | cmd
------------------------------------------------ | ------
Users can delete own files                       | DELETE
Users can insert own files                       | INSERT
Users can update own files                       | UPDATE
Users can view files they own or are members of  | SELECT
```

The **SELECT** policy is the critical one - it now includes:
- Files you own
- Files you're a member of
- **Files you have pending invitations for** ← NEW!

### Step 3: Verify Policy Creation

Run this verification query in SQL Editor:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'files'
ORDER BY cmd, policyname;
```

You should see **exactly 4 policies** as shown above.

---

## Part 4: Test File Invitations

### Test as File Owner (Sender):

1. Log in as **User A**
2. Make sure you have a friend (**User B**) in your friends list
3. Upload a PDF file or select an existing one
4. Click the **3-dot menu** on the file card
5. Click **"Share with Friends"**
6. Select **User B** from the friend list
7. Click **"Send Invitations"**

**Expected results**:
✅ Toast message: "Invitations sent successfully"
✅ Dialog closes
✅ No errors in console

### Test as Invited User (Recipient):

1. **Log out** from User A
2. Log in as **User B**
3. Look at the **notification bell** icon in the header
4. **Expected**: Bell shows a number badge (e.g., "1")

5. Click the **notification bell**
6. **Expected**: See the file invitation with:
   - File cover image
   - File title
   - "Invited by [User A's name]"
   - "Accept" and "Decline" buttons

7. Click **"Accept"**

**Expected results**:
✅ Toast message: "Invitation accepted"
✅ Page refreshes automatically
✅ File now appears in User B's **Library**
✅ User B can click the file to view it

### Test Real-Time Features (Both Users):

With **both User A and User B** logged in and viewing the same file:

1. **Presence Tracking**:
   - "Reading Together" panel should show **2 users**
   - Both should have **green online indicators**

2. **Chat**:
   - User A sends a message
   - User B should see it **immediately** without refreshing

3. **Sticky Notes**:
   - User A creates a sticky note on a page
   - User B navigates to that page
   - Sticky note should appear

---

## Troubleshooting

### PDF Worker Error Still Appears

**Symptom**: Still seeing "Failed to resolve module specifier 'pdf.worker.mjs'"

**Solutions**:

1. **Verify npm install completed**:
   ```bash
   npm list pdfjs-dist
   ```
   Should show: `pdfjs-dist@4.9.155`

2. **Clear everything and rebuild**:
   ```bash
   rm -rf .next
   rm -rf node_modules
   npm install
   npm run dev
   ```

3. **Check console for worker configuration**:
   Open browser console and refresh the page. You should see:
   ```
   [v0] PDF.js worker configured globally: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.js
   ```

4. **Try disabling Turbopack temporarily**:
   ```bash
   npm run dev -- --no-turbopack
   ```

### Invitations Still Don't Show

**Symptom**: Notification badge shows number but clicking shows "No pending invitations"

**Solutions**:

1. **Verify SQL scripts ran successfully**:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'files';
   ```
   Should show exactly 4 policies.

2. **Check browser console** when viewing invitations:
   Look for `[v0]` prefixed logs about invitations

3. **Verify RLS is enabled** on files table:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'files';
   ```
   `rowsecurity` should be `true`

4. **Check invitation exists**:
   ```sql
   SELECT id, file_id, from_user_id, to_user_id, status
   FROM file_invitations
   WHERE status = 'pending';
   ```

### Invitation Accept Fails

**Symptom**: "Failed to respond to invitation" when clicking Accept

**Solutions**:

1. **Check console logs**:
   You should see:
   ```
   [v0] Processing invitation [id] action: accept for user: [user-id]
   [v0] Found invitation: {...}
   [v0] Updated invitation status
   [v0] Added user to file_members
   [v0] Logged activity
   ```

2. **Check file_members policies**:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'file_members';
   ```

3. **Verify no duplicate member entry**:
   The API should handle this, but check:
   ```sql
   SELECT * FROM file_members
   WHERE file_id = '[file-id]' AND user_id = '[user-id]';
   ```

### Network Connection Issues

If you see network errors or timeouts:

1. **Check Supabase connection**:
   Verify `.env.local` has correct:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Check Vercel Blob**:
   Verify `.env.local` has:
   - `BLOB_READ_WRITE_TOKEN`

3. **Test API endpoints**:
   Open browser DevTools → Network tab
   Look for failed requests to `/api/invitations`

---

## What Success Looks Like

After completing all steps, you should have:

### PDF Upload & Viewing:
- ✅ Can upload PDF files without errors
- ✅ PDF preview thumbnails generate automatically
- ✅ Can click to open and view PDFs
- ✅ Can navigate pages and zoom
- ✅ Can select text and create highlights
- ✅ Console shows worker configured message

### File Invitations:
- ✅ Can share files with friends
- ✅ Recipients see notification badges
- ✅ Recipients see file preview before accepting
- ✅ Accept button works and adds file to library
- ✅ Decline button works and removes invitation
- ✅ Real-time updates work correctly

### Social Features:
- ✅ "Reading Together" shows all online users
- ✅ Chat messages appear in real-time
- ✅ Sticky notes sync between users
- ✅ Green online indicators show active readers

---

## Still Having Issues?

If you've followed all steps and still have problems:

1. **Capture the errors**:
   - Take screenshots of browser console errors
   - Copy exact error messages
   - Note which step failed

2. **Check logs**:
   - Browser console (F12)
   - Terminal running `npm run dev`
   - Supabase logs (Dashboard → Logs)

3. **Verify environment**:
   - Node version: `node --version` (should be 18+)
   - Next.js version: check package.json (should be 16.0.10)
   - All environment variables set in `.env.local`

4. **Try a fresh start**:
   ```bash
   rm -rf node_modules .next
   npm install
   npm run dev
   ```

---

**After completing this guide, your Clurb app should be fully functional with PDF uploads, file invitations, and all real-time social features working!**
