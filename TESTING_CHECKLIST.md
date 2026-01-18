# Complete Testing Checklist for Clurb

After applying the latest fixes, test all features to ensure the app is fully functional.

---

## ⚠️ FIRST: Apply Database Fix

**CRITICAL**: File invitations won't work without this!

1. Open Supabase Dashboard → SQL Editor
2. Run the script from `scripts/007-fix-invitation-rls.sql`
3. OR copy/paste from `APPLY_INVITATION_FIX.md`

---

## 🧪 Complete Testing Guide

### 1. PDF Upload & Viewing ✓

**Test Upload:**
- [ ] Click "+" button in top navigation
- [ ] Drag & drop a PDF file (or click to browse)
- [ ] File should upload with progress bar
- [ ] File appears in library grid
- [ ] Cover image generates from first page
- [ ] NO console errors about "DOMMatrix" or "pdf.worker.mjs"

**Test PDF Reader:**
- [ ] Click on a file card to open it
- [ ] PDF loads and displays (no "Failed to load PDF" error)
- [ ] Page navigation works (arrows, direct input)
- [ ] Zoom in/out works smoothly
- [ ] Can select text on the page
- [ ] NO canvas rendering errors in console

---

### 2. File Invitations (Share with Friends) ✓

**Prerequisites:**
- Have two user accounts (or two browsers)
- Users should be friends already

**Test Sending Invitation:**
- [ ] User A: Click 3-dot menu on a file
- [ ] Click "Share with Friend"
- [ ] Search for friend in the list
- [ ] Friend appears in search results
- [ ] Click friend to select them
- [ ] Click "Send Invitation"
- [ ] See success message
- [ ] Dialog closes

**Test Receiving Invitation:**
- [ ] User B: Bell icon shows notification badge with count
- [ ] Click bell icon
- [ ] Invitation appears with:
  - [ ] File cover image
  - [ ] File title
  - [ ] "Shared by [User A]"
  - [ ] Date
  - [ ] Accept (✓) button
  - [ ] Decline (✗) button
- [ ] NO "No pending invitations" message
- [ ] NO errors about null file

**Test Accepting Invitation:**
- [ ] User B: Click ✓ (accept) button
- [ ] See "Invitation accepted" toast
- [ ] Page refreshes automatically
- [ ] File now appears in User B's library
- [ ] Can click file to open it
- [ ] Has full access (can read, chat, add sticky notes)

**Test Declining Invitation:**
- [ ] User B: Click ✗ (decline) button
- [ ] See "Invitation declined" toast
- [ ] Invitation disappears from list
- [ ] File does NOT appear in library
- [ ] Bell icon badge count decreases

**Check Console Logs:**
When accepting invitation, you should see in console:
```
[v0] Processing invitation {id} action: accept for user: {userId}
[v0] Found invitation: {...}
[v0] Updated invitation status
[v0] Adding user to file_members
[v0] Added user to file_members
[v0] Logged activity
```

If you see errors, copy them and we can fix!

---

### 3. Sticky Notes ✓

**Create Sticky Note:**
- [ ] Open a file
- [ ] Click pencil icon in header
- [ ] Select note color
- [ ] Type note content
- [ ] Click on PDF to place note
- [ ] Note appears on the page
- [ ] Note persists after refresh

**View Friend's Notes:**
- [ ] User B opens shared file
- [ ] Can see User A's sticky notes
- [ ] Notes show author name
- [ ] Can delete own notes only

---

### 4. Real-Time Chat ✓

**Open Chat:**
- [ ] Click message icon in file header
- [ ] Chat panel appears bottom-right
- [ ] Panel height: 500px (not too short)
- [ ] Shows "Book Chat" title
- [ ] Has message input at bottom

**Send Messages:**
- [ ] Type a message
- [ ] Press Enter or click send button
- [ ] Message appears immediately
- [ ] Message shows your avatar
- [ ] Timestamp appears below message

**Test Real-Time:**
- [ ] User A sends message
- [ ] User B sees message appear WITHOUT refreshing
- [ ] Messages auto-scroll to bottom
- [ ] Can scroll up to see history
- [ ] Input stays fixed at bottom

**Test Scrolling:**
- [ ] Send 10+ messages
- [ ] Message history scrolls
- [ ] Input area stays visible at bottom
- [ ] Header stays visible at top
- [ ] NO cut-off messages at bottom

---

### 5. Real-Time Presence ✓

**Online Indicators:**
- [ ] User A opens a file
- [ ] User B opens same file
- [ ] Sidebar shows "Reading Together (2)"
- [ ] Shows "2 online now"
- [ ] Green dot appears on both avatars
- [ ] User A closes file
- [ ] Count updates to "1 online now"
- [ ] Green dot disappears from User A's avatar

---

### 6. Friend Management ✓

**Add Friend:**
- [ ] Go to Friends page
- [ ] Search for user by username
- [ ] Click "Add" button
- [ ] Friend request sent
- [ ] Appears in "Sent" tab

**Accept Friend Request:**
- [ ] Recipient: See badge on Friends tab
- [ ] Go to Friends page
- [ ] See request in "Requests" tab
- [ ] Click "Accept"
- [ ] Friend appears in "Friends" tab
- [ ] Can now share files with them

**Remove Friend:**
- [ ] Go to Friends page → Friends tab
- [ ] See trash icon next to friend
- [ ] Click trash icon
- [ ] Friend removed from list
- [ ] Can no longer share files with them

---

### 7. AI Agent (Optional) ✓

If you have XAI_API_KEY configured:

- [ ] Go to /agent page
- [ ] Ask: "What was the last file I was reading?"
- [ ] AI responds with correct file name
- [ ] Ask: "Show my reading activity for the last 7 days"
- [ ] AI shows chart with data
- [ ] Ask: "What books are in my library?"
- [ ] AI lists your files

---

### 8. Reading Progress ✓

**Track Progress:**
- [ ] Open a file
- [ ] Navigate to page 5
- [ ] Close file
- [ ] Reopen file
- [ ] Opens to page 5 (last read page)
- [ ] Progress bar shows on library card

**View Friend Progress:**
- [ ] Open shared file
- [ ] See friend in "Reading Together" sidebar
- [ ] Shows "Page X" under friend's name
- [ ] Shows "last read X ago"

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to resolve module specifier 'pdf.worker.mjs'"

**Solution:** Already fixed! Clear browser cache:
- Chrome: Cmd/Ctrl + Shift + R (hard refresh)
- Or: DevTools → Application → Clear storage → Reload

### Issue: "No pending invitations" (but badge shows number)

**Solution:** Run the SQL script from `scripts/007-fix-invitation-rls.sql`

See `APPLY_INVITATION_FIX.md` for step-by-step instructions.

### Issue: "Failed to respond to invitation"

**Check:**
1. Open browser console (F12)
2. Look for `[v0] Respond to invitation error:`
3. Copy full error message
4. Share with developer

**Common Causes:**
- RLS policy not applied (run SQL script)
- User not recipient of invitation
- Invitation already responded to

### Issue: PDF not loading

**Check:**
1. Browser console for errors
2. Verify file uploaded successfully
3. Check file_url in Supabase table
4. Try different PDF file

### Issue: Chat not updating in real-time

**Check:**
1. Both users have file open
2. Chat panel is open
3. Check browser console for Supabase errors
4. Verify NEXT_PUBLIC_SUPABASE_URL is correct

### Issue: Presence not showing online users

**Check:**
1. Both users on same file
2. Page fully loaded
3. Check console for presence channel errors
4. Try refreshing page

---

## ✅ Success Criteria

All features should work without errors:
- ✅ Upload PDFs
- ✅ View PDFs with zoom and navigation
- ✅ Send file invitations
- ✅ Accept/decline invitations
- ✅ Real-time chat
- ✅ Real-time presence
- ✅ Sticky notes
- ✅ Reading progress tracking
- ✅ Friend management
- ✅ NO console errors

---

## 📊 Browser Console Checks

**Good Signs (no errors):**
```
[v0] PDF loaded successfully, pages: 42
[v0] PDF page rendered successfully
[v0] Processing invitation...
[v0] Added user to file_members
[v0] Logged activity
```

**Bad Signs (errors to fix):**
```
❌ DOMMatrix is not defined
❌ Failed to resolve module specifier
❌ Cannot read properties of null
❌ Invitation not found
❌ RLS policy violation
```

If you see any errors, copy the FULL error message and share!

---

## 🔍 Debugging Steps

If something doesn't work:

1. **Open Browser Console** (F12)
2. **Look for red errors**
3. **Copy full error message**
4. **Note which action triggered it**
5. **Share details**

Helpful info to provide:
- What were you trying to do?
- What error appeared?
- What's in the console?
- Did you apply the SQL fix?

---

## 🎉 All Working?

If all tests pass:
- ✅ Core functionality works
- ✅ Real-time features work
- ✅ Social features work
- ✅ Ready for production!

Next steps:
- Add more friends
- Upload more files
- Create sticky notes
- Chat while reading
- Use AI agent to query activity

---

**Questions or Issues?**

Check:
1. `README.md` - General info
2. `SETUP.md` - Setup instructions
3. `APPLY_INVITATION_FIX.md` - Database fix
4. `DEPLOYMENT_CHECKLIST.md` - Production deployment

Happy reading! 📚
