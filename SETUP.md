# Clurb Setup Guide

This guide will help you set up Clurb from scratch and fix all current issues.

## 🔍 Issues Identified

After reviewing the codebase, here are the issues preventing the app from working:

### 1. **Missing Dependencies** ❌
- `node_modules` folder doesn't exist
- Dependencies need to be installed

### 2. **Missing Environment Variables** ❌
- `.env.local` file doesn't exist
- Required API keys and configuration missing

### 3. **Database Not Configured** ❌
- Supabase database tables haven't been created
- RLS (Row Level Security) policies not applied

### 4. **Middleware Naming Fixed** ✅
- Fixed: `proxy.ts` renamed to `middleware.ts` (Next.js requirement)
- Fixed: Export function renamed from `proxy` to `middleware`

---

## 🚀 Complete Setup Instructions

Follow these steps in order to get Clurb fully working:

### Step 1: Install Dependencies

```bash
# Navigate to the project directory
cd /home/user/clurb

# Install all dependencies using npm (or pnpm if you prefer)
npm install
# OR
pnpm install
```

**Expected result:** A `node_modules` folder will be created with all required packages.

---

### Step 2: Set Up Supabase

1. **Create a Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up or log in
   - Click "New Project"

2. **Create a New Project**
   - Name: `clurb` (or any name you prefer)
   - Database Password: Choose a strong password (save it somewhere safe)
   - Region: Choose closest to you
   - Click "Create new project"
   - Wait 2-3 minutes for project setup

3. **Get Your API Keys**
   - Go to **Settings** → **API**
   - Copy the following:
     - **Project URL** (looks like: `https://xxxxx.supabase.co`)
     - **anon public** key (starts with `eyJ...`)
     - **service_role** key (starts with `eyJ...`)

4. **Run Database Migrations**

   Option A: Using Supabase SQL Editor (Recommended)
   ```
   1. Go to your Supabase Dashboard
   2. Click "SQL Editor" in the left sidebar
   3. Click "New query"
   4. Copy the contents of scripts/001-create-clurb-schema.sql
   5. Paste into the editor
   6. Click "Run"
   7. Repeat for scripts/006-add-file-invitations.sql
   ```

   Option B: Using Supabase CLI
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Link your project
   supabase link --project-ref your-project-ref

   # Run migrations
   supabase db push
   ```

5. **Verify Tables Were Created**
   - Go to **Table Editor** in Supabase Dashboard
   - You should see these tables:
     - profiles
     - files
     - file_members
     - reading_progress
     - sticky_notes
     - chat_messages
     - highlights
     - activity_log
     - friendships
     - file_invitations

---

### Step 3: Set Up Vercel Blob Storage

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up or log in

2. **Create a Blob Store**
   - Go to **Storage** tab
   - Click "Create Database"
   - Select "Blob"
   - Name it `clurb-files`
   - Click "Create"

3. **Get Your Blob Token**
   - After creation, you'll see connection strings
   - Copy the `BLOB_READ_WRITE_TOKEN` value
   - It looks like: `vercel_blob_rw_xxxxx`

---

### Step 4: Set Up xAI (Grok) API

The AI agent uses Grok for natural language queries about reading activity.

1. **Get Grok API Access**
   - Go to [console.x.ai](https://console.x.ai) or [x.ai](https://x.ai)
   - Sign up for an account
   - Navigate to API Keys section
   - Create a new API key
   - Copy the key (starts with `xai-`)

**Alternative:** If you prefer to use OpenAI instead:
- You can modify `/app/api/agent/route.ts` line 308
- Change `model: "xai/grok-3-mini"` to `model: "gpt-4"`
- Set `OPENAI_API_KEY` instead of `XAI_API_KEY`

---

### Step 5: Create Environment Variables File

1. **Copy the example file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local` with your actual values:**
   ```bash
   # Open in your editor
   nano .env.local
   # OR
   code .env.local
   ```

3. **Fill in all values:**
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # For local development only
   NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/library

   # Vercel Blob Storage
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

   # xAI Grok API
   XAI_API_KEY=xai-xxxxx
   ```

4. **Save the file**

---

### Step 6: Start the Development Server

```bash
npm run dev
```

**Expected output:**
```
  ▲ Next.js 16.0.10
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

---

### Step 7: Test the Application

1. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)

2. **Create an account**
   - Click "Sign Up" or go to `/auth/sign-up`
   - Enter:
     - Email address
     - Password (min 6 characters)
     - Username
   - Click "Sign Up"
   - Check your email for verification link
   - Click the verification link

3. **Log in**
   - Go to `/auth/login`
   - Enter your email and password
   - Click "Log In"
   - You should be redirected to `/library`

4. **Test file upload**
   - Click the "+" button in the top right
   - Drag and drop a PDF file (max 50MB)
   - Give it a title
   - Click "Upload"
   - Wait for upload to complete
   - File should appear in your library

5. **Test PDF reader**
   - Click on an uploaded file card
   - You should be redirected to `/read/[id]`
   - PDF should load and be readable
   - Try:
     - Zooming in/out
     - Navigating pages
     - Creating a sticky note (pencil icon)
     - Opening chat (message icon)
     - Selecting text for AI highlight

6. **Test AI Agent**
   - Go to `/agent`
   - Try asking:
     - "What was the last file I was reading?"
     - "Show me my reading activity over the last 7 days"
     - "What books are in my library?"
   - AI should respond with relevant data

---

## 🎯 What Was Fixed

### Code Fixes Applied:

1. **middleware.ts** (middleware.ts:4)
   - **Issue:** Function was named `proxy` instead of `middleware`
   - **Fix:** Renamed export function to `middleware`
   - **Impact:** Authentication middleware now runs correctly

2. **File renamed**
   - **Issue:** File was named `proxy.ts` instead of `middleware.ts`
   - **Fix:** Renamed file to `middleware.ts`
   - **Impact:** Next.js now recognizes and runs the middleware

### Configuration Files Created:

1. **.env.local.example**
   - Template for environment variables
   - Documents all required keys
   - Includes instructions for obtaining each key

2. **SETUP.md** (this file)
   - Complete setup instructions
   - Troubleshooting guide
   - Testing checklist

---

## 🐛 Troubleshooting

### Issue: "Upload fails with 401 Unauthorized"

**Cause:** Missing or incorrect `BLOB_READ_WRITE_TOKEN`

**Solution:**
1. Verify token in `.env.local` is correct
2. Make sure it starts with `vercel_blob_rw_`
3. Restart dev server after changing env variables

---

### Issue: "Database error: relation 'profiles' does not exist"

**Cause:** Database schema not applied

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run `scripts/001-create-clurb-schema.sql`
3. Run `scripts/006-add-file-invitations.sql`
4. Refresh the page

---

### Issue: "PDF not loading in reader"

**Causes:**
- File URL is broken
- CORS issue
- File wasn't uploaded correctly

**Solutions:**
1. Check browser console for errors
2. Verify file exists in Vercel Blob dashboard
3. Try uploading the file again
4. Check file_url in Supabase table editor

---

### Issue: "AI Agent not responding"

**Causes:**
- Missing `XAI_API_KEY`
- Invalid API key
- API quota exceeded

**Solutions:**
1. Verify `XAI_API_KEY` is set in `.env.local`
2. Check API key is valid at [console.x.ai](https://console.x.ai)
3. Check browser Network tab for API errors
4. Look at server logs in terminal

---

### Issue: "User can't access files after upload"

**Cause:** RLS policies not applied correctly

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run `scripts/005-fix-rls-unique.sql`
3. This will fix Row Level Security policies

---

### Issue: "Environment variables not loading"

**Solutions:**
1. Make sure file is named exactly `.env.local` (not `.env.local.txt`)
2. Restart the dev server completely (Ctrl+C then `npm run dev`)
3. Check for typos in variable names
4. Make sure there are no spaces around `=` signs

---

## 📋 Feature Checklist

After setup, verify these features work:

- [ ] User sign up and email verification
- [ ] User login and authentication
- [ ] File upload (PDF, EPUB, TXT)
- [ ] File appears in library grid
- [ ] Click file to open reader
- [ ] PDF renders correctly
- [ ] Page navigation works
- [ ] Zoom in/out works
- [ ] Create sticky notes
- [ ] Sticky notes appear on page
- [ ] Chat panel opens
- [ ] Send chat messages
- [ ] AI agent responds to queries
- [ ] Text selection for AI highlight
- [ ] Share file with friends
- [ ] View friend's reading progress

---

## 🔒 Security Notes

1. **Never commit `.env.local`** to git
   - Already in `.gitignore`
   - Contains sensitive API keys

2. **Use different keys for production**
   - Create separate Supabase project for production
   - Use production Blob token
   - Use production API keys

3. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Users can only access their own data and shared files
   - Enforced at database level

---

## 📚 Additional Resources

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel AI SDK:** [sdk.vercel.ai](https://sdk.vercel.ai)
- **xAI Console:** [console.x.ai](https://console.x.ai)

---

## 💡 Next Steps

Once everything is working:

1. **Invite friends** to test the social features
2. **Upload multiple files** to test the library
3. **Create sticky notes** for friends to discover
4. **Chat in real-time** while reading together
5. **Query the AI agent** about your reading habits

---

## 🎉 You're All Set!

If you followed all steps, your Clurb application should now be fully functional. Enjoy your social reading experience!

For issues or questions, refer to the troubleshooting section or check the main README.md file.
