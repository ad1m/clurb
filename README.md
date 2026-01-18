# Clurb - Social Reading Platform

**The New Book Club.** A social reading application that transforms reading PDFs and documents into a collaborative, AI-powered experience with friends.

## Overview

Clurb allows users to upload documents, share them with friends, leave surprise sticky notes on pages, chat in real-time while reading, and query their reading activity through an AI agent. Every interaction becomes data that can be analyzed and summarized by AI.

---

## Features

- **Document Upload & Management**: Upload PDFs, EPUBs, and text files up to 50MB
- **Social Reading**: Share documents with friends and see their reading progress
- **Surprise Sticky Notes**: Leave colorful notes on pages for friends to discover
- **Real-time Chat**: Group chat within each document as you read together
- **PDF Reader**: Full-featured reader with zoom, page navigation, and text selection
- **AI Agent Analytics**: Natural language queries about your reading activity
  - "What was the last book I was reading?"
  - "Can you summarize my reading activity over the last week?"
  - "What notes have my friends left in my files?"
  - "Show me a daily bar chart of pages read over the last week"
  - "What page is @SarahSmith on in the book we're both reading?"
- **AI Text Highlights**: Select text while reading to get AI explanations, summaries, or generate images
- **Friend System**: Search users, send friend requests, and build your reading community
- **Reading Progress Tracking**: Automatic page tracking and progress visualization
- **Activity Logging**: All actions logged for AI-powered insights

---

## Tech Stack

### Frontend
- **Next.js 16** (App Router) - React framework with server components
- **React 19.2** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Component library (Radix UI primitives)
- **react-pdf** - PDF rendering and viewing
- **react-dropzone** - File upload interface

### Backend & Database
- **Supabase** - PostgreSQL database with real-time subscriptions
  - Authentication (email/password)
  - Row Level Security (RLS)
  - Real-time chat and presence
- **Vercel Blob** - File storage for PDFs and documents

### AI & Analytics
- **Vercel AI SDK (6.0)** - AI integration framework
- **Grok (xAI)** - Large language model for:
  - Reading analytics and insights
  - Natural language queries
  - Text explanations and summaries
  - Chart generation from reading data
- **AI SDK React** - Streaming responses and chat interface

### Infrastructure
- **Vercel** - Hosting and serverless functions
- **Next.js API Routes** - Backend API endpoints

---

## Architecture

### Database Schema

The application uses 9 core tables in PostgreSQL:

1. **profiles** - User profiles extending Supabase auth
2. **files** - Uploaded documents with metadata
3. **file_members** - File sharing and access control
4. **reading_progress** - Page tracking per user per file
5. **sticky_notes** - Notes left on pages with position and color
6. **chat_messages** - Real-time chat within files
7. **highlights** - Text selections with AI interactions
8. **activity_log** - All user actions for AI analytics
9. **friendships** - Friend connections and requests

All tables have Row Level Security (RLS) policies ensuring users can only access their own data and shared content.

### File Storage Flow

1. User selects a file in the upload dialog
2. File is uploaded directly to Vercel Blob via XMLHttpRequest (streaming, up to 50MB)
3. Blob returns a public URL
4. Metadata is saved to the `files` table in Supabase
5. User is automatically added to `file_members` as owner
6. First page is rendered to canvas and saved as `cover_image_url`

### AI Components

#### 1. AI Agent (`/agent` page)
- Powered by Grok AI via Vercel AI SDK
- Uses AI SDK tools to query database:
  - `getLastReadFile` - Retrieves most recent file
  - `getReadingActivity` - Fetches activity within date range
  - `getFriendNotes` - Finds sticky notes from friends
  - `getPagesReadChart` - Generates chart data
  - `getFriendProgress` - Checks friend's reading position
  - `summarizeFile` - Summarizes content up to a specific page
- Streams responses in real-time using `useChat` hook
- Renders interactive charts using Recharts

#### 2. Highlight AI (`/read/[id]` page)
- Triggered when user selects text
- Opens popover with prompt input
- Sends highlighted text + prompt to `/api/highlight-ai`
- Grok generates response (explanation, summary, or image description)
- Result saved to `highlights` table
- Future: Integration with image generation models

### Authentication Flow

1. User signs up with email/password via Supabase Auth
2. Username is stored in `profiles` table
3. Session token stored in HTTP-only cookie
4. Middleware (`proxy.ts`) refreshes tokens on each request
5. All API routes verify user via `createClient()` from server
6. RLS policies enforce access control at database level

### Real-time Features

Supabase Realtime subscriptions enable:
- **Live chat** - New messages appear instantly
- **Presence** - See who's currently reading
- **Progress updates** - Watch friends' page numbers change
- **Sticky note discovery** - Notes appear as they're created

---

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- A Vercel account (free tier works)
- An xAI account with Grok API access

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd clurb
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: For email redirect during development
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/library

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# xAI Grok API
XAI_API_KEY=your_xai_api_key
```

#### Where to Get These Keys:

**Supabase:**
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings → API
3. Copy the "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy the "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

**Vercel Blob:**
1. Go to [vercel.com](https://vercel.com) and create a new project
2. Go to Storage → Create Database → Blob
3. Copy the `BLOB_READ_WRITE_TOKEN` from the connection string

**xAI Grok:**
1. Sign up at [x.ai](https://x.ai) or [console.x.ai](https://console.x.ai)
2. Create an API key
3. Copy the key → `XAI_API_KEY`

### 3. Set Up the Database

Run the database migration script to create all tables and RLS policies:

```bash
# Using the Supabase CLI (recommended)
npx supabase db push

# Or manually:
# 1. Go to your Supabase project dashboard
# 2. Navigate to SQL Editor
# 3. Copy the contents of scripts/001-create-clurb-schema.sql
# 4. Paste and run the SQL
# 5. Then run scripts/005-fix-rls-unique.sql for the RLS policies
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Your First Account

1. Navigate to `/auth/sign-up`
2. Enter email, password, and username
3. Check your email for the confirmation link
4. After confirming, sign in at `/auth/login`
5. You'll be redirected to `/library`

---

## Project Structure

```
clurb/
├── app/                          # Next.js App Router pages
│   ├── agent/                   # AI agent chat interface
│   ├── api/                     # API routes
│   │   ├── agent/              # AI agent with tools
│   │   ├── blob-upload/        # File upload to Blob
│   │   ├── files/[id]/         # File CRUD operations
│   │   ├── highlight-ai/       # Text highlight AI
│   │   └── upload/             # File metadata save
│   ├── auth/                    # Authentication pages
│   │   ├── login/
│   │   ├── sign-up/
│   │   └── error/
│   ├── friends/                 # Friend management
│   ├── library/                 # Main dashboard
│   ├── profile/                 # User profile
│   ├── read/[id]/              # PDF reader
│   ├── globals.css             # Global styles
│   └── layout.tsx              # Root layout
├── components/                   # React components
│   ├── ui/                     # shadcn/ui components
│   ├── ai-highlight-popup.tsx  # Text selection AI
│   ├── chat-panel.tsx          # Real-time chat
│   ├── file-card.tsx           # Library card view
│   ├── file-actions-menu.tsx   # Rename/delete menu
│   ├── library-grid.tsx        # File grid layout
│   ├── pdf-viewer.tsx          # PDF rendering
│   ├── sticky-note.tsx         # Sticky note display
│   ├── sticky-note-creator.tsx # Create notes
│   ├── upload-dialog.tsx       # File upload
│   └── ...
├── lib/                          # Utilities
│   ├── supabase/               # Supabase clients
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── proxy.ts            # Middleware helper
│   └── types.ts                # TypeScript types
├── scripts/                      # Database migrations
│   ├── 001-create-clurb-schema.sql
│   └── 005-fix-rls-unique.sql
├── proxy.ts                      # Middleware for auth
└── package.json
```

---

## Key Files Explained

### Authentication
- `lib/supabase/client.ts` - Browser-side Supabase client
- `lib/supabase/server.ts` - Server-side Supabase client with cookies
- `proxy.ts` - Middleware that refreshes auth tokens on each request

### File Upload
- `components/upload-dialog.tsx` - Upload UI with drag-and-drop
- `app/api/blob-upload/route.ts` - Streams file to Vercel Blob
- `app/api/upload/route.ts` - Saves metadata to database

### PDF Reading
- `components/pdf-viewer.tsx` - Renders PDFs using react-pdf
- `app/read/[id]/page.tsx` - Reader page with sidebar and chat
- `components/sticky-note.tsx` - Displays notes on pages

### AI Features
- `app/api/agent/route.ts` - AI agent with database query tools
- `app/agent/page.tsx` - Chat interface for AI agent
- `components/ai-highlight-popup.tsx` - Highlight text for AI analysis

---

## Database Management

### Running Migrations

All migration scripts are in the `scripts/` folder. To run them:

1. Via Supabase CLI (recommended):
```bash
npx supabase migration new your_migration_name
# Edit the file, then:
npx supabase db push
```

2. Via SQL Editor in Supabase Dashboard:
   - Copy script contents
   - Paste in SQL Editor
   - Run query

### Resetting the Database

```bash
# Drop all tables (use with caution!)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS highlights CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS sticky_notes CASCADE;
DROP TABLE IF EXISTS reading_progress CASCADE;
DROP TABLE IF EXISTS file_members CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

# Then re-run the schema script
```

---

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add all environment variables from `.env.local`
5. Deploy

Vercel will automatically:
- Build your Next.js app
- Set up Blob storage
- Deploy serverless functions
- Enable preview deployments

### Environment Variables in Production

Make sure to add all required environment variables in:
- Vercel Dashboard → Settings → Environment Variables

Use production keys (not development keys) for:
- `XAI_API_KEY` (production API key)
- `BLOB_READ_WRITE_TOKEN` (production Blob token)
- Remove `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` in production

---

## Troubleshooting

### Upload Fails
- Check `BLOB_READ_WRITE_TOKEN` is set correctly
- Verify file is under 50MB
- Check browser console for errors

### Database Errors
- Verify RLS policies are enabled: Run `scripts/005-fix-rls-unique.sql`
- Check Supabase connection: Test with `SELECT * FROM profiles`
- Ensure user is authenticated: Check for auth cookie

### PDF Not Loading
- Verify `file_url` in database points to valid Blob URL
- Check CORS settings (Blob URLs are public by default)
- Inspect browser console for PDF.js errors

### AI Agent Not Working
- Verify `XAI_API_KEY` is set and valid
- Check AI SDK version: `npm list ai @ai-sdk/react`
- Look for errors in `/api/agent` logs

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test locally
5. Commit: `git commit -m "Add feature"`
6. Push: `git push origin feature-name`
7. Open a Pull Request

---

## License

MIT License - feel free to use this for your own projects!

---

## Contact & Support

For issues, questions, or feature requests, please open an issue on GitHub.

Happy reading! 📚
