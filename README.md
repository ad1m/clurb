# Clurb — Social Reading Platform

**The New Book Club.** A social reading app that transforms PDF documents into a collaborative, AI-powered experience — with sticky notes, freehand markup, per-page AI chat, and reading progress tracking.

---

## Features

- **PDF Library** — Upload and manage PDFs with automatic cover generation
- **PDF Reader** — Full-featured viewer with zoom, page navigation, and text selection
- **Sticky Notes** — Drag-and-drop emoji stickers with custom icons, shapes, and colors, pinned to pages
- **Markup Tools** — Freehand pen and highlight tools drawn directly on the page and in the margins
- **AI Assistant Sidebar** — Per-file AI chat that can read any page on demand; select text to ask questions about it
- **AI Agent** — Standalone chat page for natural-language queries about your reading activity
- **Reading Progress** — Automatic page tracking restored on every return visit
- **Chat History** — Conversations saved per file and accessible from the sidebar

---

## Tech Stack

### Frontend
| Library | Purpose |
|---------|---------|
| **Next.js 16** (App Router) | React framework |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui** (Radix UI) | Component library |
| **react-pdf / pdfjs-dist** | PDF rendering |
| **react-markdown + remark-gfm** | Markdown rendering for AI responses |

### Backend & Database
| Library | Purpose |
|---------|---------|
| **SQLite** via **better-sqlite3** | Embedded local database |
| **Drizzle ORM** | Type-safe database queries |
| **jose** | JWT authentication (HTTP-only cookies) |
| **bcryptjs** | Password hashing |
| **unpdf** | Server-side PDF text extraction for AI |

### AI
| Library | Purpose |
|---------|---------|
| **AI SDK v4** (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) | Streaming AI responses |
| **OpenAI** | LLM provider (GPT-4o) |

### Testing
| Library | Purpose |
|---------|---------|
| **Vitest** | Unit test runner |

---

## Local Development

### Prerequisites

- **Node.js 18+** and npm
- An **OpenAI API key**

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd clurb
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```bash
# Required — AI features
OPENAI_API_KEY=sk-...

# Required — JWT signing secret (any long random string)
JWT_SECRET=your-super-secret-jwt-key-change-me

# Optional — defaults shown
DATABASE_PATH=./clurb.db
UPLOAD_DIR=./uploads
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database and `uploads/` folder are created automatically on first run — no migration step needed.

### 4. Create an Account

Navigate to `/auth/sign-up`, enter email, password, and username. You'll be redirected to `/library` after signing in.

---

## Project Structure

```
clurb/
├── app/
│   ├── agent/                   # Standalone AI agent chat page
│   ├── api/
│   │   ├── agent/               # AI agent + tool calling
│   │   ├── annotations/         # Page annotation save/load
│   │   ├── assistant-chats/     # In-file AI chat history
│   │   ├── auth/                # Login, sign-up, me, logout
│   │   ├── files/               # File CRUD + file serving
│   │   ├── highlight-ai/        # Streaming AI for text selections
│   │   ├── reading-progress/    # Page progress tracking
│   │   └── sticky-notes/        # Sticky note CRUD
│   ├── auth/                    # Login & sign-up pages
│   ├── library/                 # Main dashboard (file grid)
│   ├── profile/                 # User profile
│   ├── read/[id]/               # PDF reader page
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── ai-assistant-sidebar.tsx # In-reader AI chat panel
│   ├── annotation-canvas.tsx    # Canvas overlay for markup tools
│   ├── annotation-toolbar.tsx   # Highlighter / pen / eraser toolbar
│   ├── file-card.tsx            # Library card with PDF cover preview
│   ├── library-grid.tsx         # File grid layout
│   ├── pdf-viewer.tsx           # react-pdf wrapper with margin space
│   ├── sticker.tsx              # Draggable emoji sticker
│   ├── sticker-creator.tsx      # Sticker creation dialog
│   └── upload-dialog.tsx        # File upload with drag-and-drop
│
├── db/
│   ├── index.ts                 # SQLite connection + table init
│   └── schema.ts                # Drizzle ORM schema
│
├── lib/
│   ├── auth.ts                  # JWT helpers
│   ├── local-storage.ts         # File path resolution + PDF text extraction
│   └── types.ts                 # Shared TypeScript types
│
├── __tests__/
│   └── unit/                    # Vitest unit tests
│
├── proxy.ts                     # Next.js 16 auth middleware
└── vitest.config.ts
```

---

## Database Schema

All data lives in a local SQLite file (`clurb.db`, git-ignored).

| Table | Purpose |
|-------|---------|
| `users` | Accounts (email, password hash, username) |
| `files` | Uploaded documents with metadata |
| `reading_progress` | Current page per user per file |
| `sticky_notes` | Notes pinned to pages with position + style |
| `highlights` | Text selections (for AI history) |
| `page_annotations` | Canvas marks (pen strokes + highlights) per page |
| `agent_chats` | AI chat sessions, optionally scoped to a file |
| `agent_messages` | Messages within a chat |
| `activity_log` | All user actions for AI analytics |

---

## Key Behaviours

### PDF Markup
- **Highlight tool** — drag to draw a semi-transparent rectangle over text
- **Pen tool** — freehand strokes anywhere on the page or in the margins
- **Eraser** — hover over marks to remove them
- Marks are stored as relative (0–1) coordinates so they survive zoom changes
- Saves automatically with an 800 ms debounce per page

### AI Assistant (in-reader)
- Per-file conversation history, persisted to DB
- `getPageContent` tool lets the AI fetch the text of any page range on demand
- Selecting text pre-populates the input and opens the sidebar
- Supports Explain / Summarize / Visualize quick actions

### AI Agent (standalone)
- Natural language queries about reading activity
- Tools: `getLastReadFile`, `getReadingActivity`, `summarizeFile`, `getCurrentDatetime`

### Authentication
- Email + password, hashed with bcrypt
- JWT stored in an HTTP-only cookie (`clurb-token`)
- `proxy.ts` (Next.js 16 middleware) verifies the token on every request

---

## Scripts

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Serve production build
npm run test         # Run Vitest unit tests once
npm run test:watch   # Vitest in watch mode
npm run lint         # ESLint
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key for all AI features |
| `JWT_SECRET` | ✅ | — | Secret used to sign/verify auth tokens |
| `DATABASE_PATH` | ❌ | `./clurb.db` | Path to SQLite database file |
| `UPLOAD_DIR` | ❌ | `./uploads` | Directory where uploaded files are stored |

---

## Deployment Notes

This app is designed for **self-hosted / local deployment** — it uses SQLite and local file storage rather than a managed database or object store. For a production deployment you would want to:

1. Set `DATABASE_PATH` to a persistent volume path
2. Set `UPLOAD_DIR` to a persistent volume path
3. Set strong, randomly generated `JWT_SECRET` and `OPENAI_API_KEY` environment variables
4. Run behind a reverse proxy (nginx / Caddy) with HTTPS

---

## License

MIT — use this for your own projects!
