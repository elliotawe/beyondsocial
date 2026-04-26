# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start development server
pnpm build      # Production build
pnpm lint       # ESLint with Next.js core web vitals + TypeScript rules
pnpm start      # Start production server
```

No test suite is configured.

## What This App Does

Beyond Social is an **AI-powered short-form video creation and publishing platform**. The core flow:

1. **Discovery** — AI surfaces trending video ideas for a user's niche/industry
2. **Script generation** — GPT-4o-mini refines the idea into a structured script (scenes, CTA)
3. **Video generation** — Wan AI (DashScope) generates video from the script + uploaded image (async, polled via `taskId`)
4. **Storage** — Generated video uploaded to Cloudinary
5. **Scheduling** — User schedules video to TikTok, Instagram, LinkedIn, Facebook
6. **Learning loop** — Past high-performing projects are fed back into future script generation prompts

## Architecture

### Stack
- **Next.js 16 App Router** with TypeScript strict mode
- **MongoDB + Mongoose** for data persistence
- **NextAuth.js v5** (JWT sessions) with Google OAuth + email/password credentials
- **OpenAI** (GPT-4o-mini) for script and idea generation
- **Wan AI / DashScope** for image-to-video synthesis (async jobs)
- **Cloudinary** for video storage
- **shadcn/ui + Radix UI + Tailwind CSS v4** for UI

### Key Directories

- `app/api/` — All API routes (Next.js App Router route handlers)
- `app/dashboard/` — Authenticated user pages
- `app/admin/` — Admin-only pages (role-gated)
- `lib/` — Service integrations and utilities
- `models/` — Mongoose schemas (User, Project, Job)
- `components/dashboard/` — Feature-specific React components
- `components/ui/` — shadcn/ui component library

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/ai-video/refine` | GPT-4o refines rough idea → structured script |
| `POST /api/ai-video/generate` | Submits to Wan AI, returns `taskId` |
| `GET /api/ai-video/status/[projectId]` | Polls Wan AI async job status |
| `POST /api/discovery/trending` | Generates 8–12 trending ideas for a niche |
| `POST /api/discovery/concept` | Converts selected idea to full script |
| `POST /api/upload/image` | Uploads image to Cloudinary |
| `GET/POST /api/projects` | List / create projects |
| `GET/PATCH /api/projects/[id]` | Get / update project |
| `GET /api/projects/calendar` | Scheduled posts by date |
| `GET/PATCH /api/user/settings` | User preferences |
| `GET /api/admin/stats` | Admin dashboard stats |

### Data Models

**Project** — central entity. Key fields:
- `status`: `draft → processing → completed | failed`
- `script`: `{ video_style, tone, scenes[], cta }` where each scene has `{ role, duration, script, visual_direction }`
- `taskId`: Wan AI async job ID (used for polling)
- `cloudinaryUrl` / `cloudinaryPublicId`: final video location
- `socialPlatforms[]`, `socialStatus`, `scheduledAt`: publishing state
- `analytics`: `{ views, engagement, shares, performanceScore }`

**User** — includes `planTier` (free|pro|business), `credits`, `role` (user|admin), Stripe fields, and notification/preference settings.

**Job** — tracks async background work (video generation, social posting) with `providerTaskId`.

### Service Layer (`lib/`)

- `ai-service.ts` — `refineVideoIdea()`, `generateWanVideo()`, `getWanVideoStatus()`
- `discovery-service.ts` — `generateContentIdeas()`, `generateScriptFromIdea()` (Zod-validated outputs)
- `cloudinary-service.ts` — `uploadVideo()`, `getThumbnailUrl()`
- `db.ts` — Mongoose connection with dev hot-reload caching
- `mongodb.ts` — Native MongoDB client (used by NextAuth adapter only)
- `auth-context.tsx` — React context wrapping NextAuth `useSession`

### Auth

NextAuth v5 with JWT strategy. Custom JWT/session callbacks inject `role`, `credits`, and `planTier` into the session. Signup at `POST /api/auth/signup` creates a User with 5 free credits and a bcrypt-hashed password.

### Notable Patterns

- **Async video generation**: `POST /api/ai-video/generate` returns a `taskId`; the client polls `GET /api/ai-video/status/[projectId]` until `status` is `completed` or `failed`.
- **Social posting and analytics are currently mocked** in `lib/social-service.ts` and `lib/analytics-service.ts`.
- **Real estate mode**: special prompt branch in `refineVideoIdea()` for property tour content.
- **Credits system**: users spend credits per video generation; admins can adjust via `/api/admin/users/credits`.
- **Image uploads**: max 5MB (configured in `next.config.ts` server action body limit).

## Required Environment Variables

```
MONGODB_URI
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
OPENAI_API_KEY
DASHSCOPE_API_KEY         # Wan AI (image-to-video)
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
APIFY_API_TOKEN           # Web scraping (optional, not core path)
```
