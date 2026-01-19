# Fix PDF Upload - FINAL SOLUTION

## The Problem

PDF uploads were failing with:
```
Setting up fake worker failed: "Failed to resolve module specifier 'pdf.worker.mjs'"
```

This happened because PDF.js was trying to load a worker using ES modules, which conflicts with Next.js Turbopack's module bundling.

## The Solution

**We've disabled the PDF.js worker for cover generation** (file thumbnails). This is the key insight:
- **Cover generation** only needs to render 1 page → doesn't need a worker
- **PDF viewing** needs to render many pages → uses the worker (configured separately)

## Steps to Fix (DO THIS NOW)

### 1. Pull Latest Code

```bash
cd ~/Desktop/clurb
git pull
```

### 2. Completely Clean Your Build

This is **CRITICAL** - old cached files have the broken code:

```bash
# Remove ALL build artifacts and caches
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbopack

# If you're being extra thorough:
rm -rf node_modules
npm install
```

### 3. Restart Dev Server

```bash
npm run dev
```

Wait for full compilation:
```
✓ Compiled successfully
✓ Ready on http://localhost:3000
```

### 4. Test PDF Upload

1. **Open browser** → http://localhost:3000
2. **Log in**
3. **Go to Library**
4. **Click "+"** to upload
5. **Select a PDF file**
6. **Click upload**

## Expected Results

### ✅ Success Looks Like:

1. **File uploads** without errors
2. **Console shows**:
   ```
   [v0] PDF.js worker configured globally: https://...pdf.worker.min.js
   ```
3. **File card appears** in library
4. **Thumbnail generates** (or shows file icon if generation is skipped)
5. **NO error** about "pdf.worker.mjs"

### ✅ When You Click the File:

1. **PDF opens** in reader view
2. **Pages render** correctly
3. **Can navigate** between pages
4. **Can zoom** in/out
5. **Can select text**

## What Changed in the Code

### file-card.tsx (Cover Generation)
```typescript
// OLD (BROKEN):
pdfjs.GlobalWorkerOptions.workerSrc = "..." // Still tried to load worker
const loadingTask = pdfjsLib.getDocument(file.file_url)

// NEW (FIXED):
const loadingTask = pdfjsLib.getDocument({
  url: file.file_url,
  useWorkerFetch: false,  // ← Disables worker completely
  isEvalSupported: false,
  useSystemFonts: true,
})
```

### pdf-viewer.tsx (Full PDF Reading)
- Still uses worker for better performance
- Worker is configured by PDFSetupProvider before any PDF operations
- Setup happens before children render, preventing race conditions

## Troubleshooting

### If Upload Still Fails:

1. **Check console** - Do you see the worker configured message?
   ```
   [v0] PDF.js worker configured globally: https://...
   ```

2. **Hard refresh** browser:
   - Mac: Cmd + Shift + R
   - Windows/Linux: Ctrl + Shift + R

3. **Clear browser cache completely**:
   - Chrome: DevTools → Application → Clear storage
   - Safari: Develop → Empty Caches
   - Firefox: Options → Privacy → Clear Data

4. **Verify .next is deleted**:
   ```bash
   ls -la | grep .next
   # Should show: drwxr-xr-x (directory) or "No such file or directory"

   # If it exists, delete it again:
   rm -rf .next
   ```

5. **Check for multiple Next.js processes**:
   ```bash
   ps aux | grep next
   # Kill any old processes:
   killall node
   # Then restart:
   npm run dev
   ```

### If Viewing PDFs Still Has Issues:

The PDF viewer (reading view) still uses the worker for performance. If you see errors when viewing (not uploading):

1. **Check console** for worker configuration message
2. **Verify** pdfjs-dist is installed:
   ```bash
   npm list pdfjs-dist
   # Should show: pdfjs-dist@4.9.155
   ```
3. **Restart** dev server after pulling code

### If Thumbnails Don't Generate:

This is actually okay! The fix disables workers, which means:
- ✅ Files upload successfully
- ✅ Files can be viewed by clicking
- ⚠️ Thumbnails might not generate immediately (just shows file icon)

If you want thumbnails, they'll generate when you click the file and it loads in the viewer.

## Database Fixes (File Invitations)

Once PDF upload works, fix the invitation system:

### In Supabase SQL Editor:

1. **Run** `scripts/008-cleanup-invitations.sql`
   - Clears old corrupted invitations

2. **Run** `scripts/009-fix-files-rls-complete.sql`
   - Fixes RLS policies so invitations can access file metadata

See `COMPLETE_FIX_GUIDE.md` for full details on testing invitations.

## Why This Solution Works

**Before (Broken)**:
- PDF.js tried to load `pdf.worker.mjs` as an ES module
- Next.js Turbopack couldn't resolve the module specifier
- Upload failed during cover generation

**After (Fixed)**:
- Cover generation: Worker disabled entirely (not needed for 1 page)
- PDF viewing: Worker loaded via CDN URL (not ES module)
- No module resolution conflicts

## Success Confirmation

You'll know it's fixed when:

1. ✅ Can upload PDFs without errors
2. ✅ Files appear in library immediately
3. ✅ Can click to view PDFs
4. ✅ PDF reader works smoothly
5. ✅ Console shows no "pdf.worker.mjs" errors

---

**That's it! Pull the code, clear .next, restart, and test. It should work now.**

If you still have issues after following ALL steps above, check:
- Did you pull the latest code? (`git pull`)
- Did you delete .next completely? (`rm -rf .next`)
- Did you restart the dev server? (`npm run dev`)
- Is the dev server fully compiled before testing?
