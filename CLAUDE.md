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
3. **Video generation** — Inngest orchestrates: Creatify Aurora (talking-head avatar via fal.ai) + Kling 2.5 Turbo Pro (b-roll per image via fal.ai) + Shotstack (final composition with captions + music)
4. **Storage** — All clips and the final composed video uploaded to Cloudinary
5. **Scheduling** — User schedules video to TikTok, Instagram, LinkedIn, Facebook
6. **Learning loop** — Past high-performing projects are fed back into future script generation prompts

## Architecture

### Stack
- **Next.js 16 App Router** with TypeScript strict mode
- **MongoDB + Mongoose** for data persistence
- **NextAuth.js v5** (JWT sessions) with Google OAuth + email/password credentials
- **OpenAI** (GPT-4o-mini) for script and idea generation
- **fal.ai** — Creatify Aurora (talking-head avatar) + Kling 2.5 Turbo Pro (b-roll image-to-video)
- **Shotstack** for final video composition (captions, music, timeline stitching)
- **Inngest** for durable async job orchestration (event-driven, step functions)
- **Cloudinary** for permanent video storage (clips + final composed video)
- **shadcn/ui + Radix UI + Tailwind CSS v4** for UI

### Key Directories

- `app/api/` — All API routes (Next.js App Router route handlers)
- `app/dashboard/` — Authenticated user pages
- `app/admin/` — Admin-only pages (role-gated)
- `lib/` — Service integrations and utilities
- `lib/inngest/` — Inngest function definitions
- `models/` — Mongoose schemas (User, Project, Job)
- `components/dashboard/` — Feature-specific React components
- `components/ui/` — shadcn/ui component library

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/ai-video/refine` | GPT-4o-mini refines rough idea → structured script |
| `POST /api/ai-video/generate` | Fires Inngest `video/generate.requested` event, returns `projectId` |
| `GET /api/ai-video/stream/[projectId]` | SSE stream — polls DB + fal.ai status for live progress |
| `POST /api/webhooks/fal` | fal.ai webhook — fires `video/clip.completed` Inngest event |
| `POST /api/webhooks/shotstack` | Shotstack webhook — fires `video/shotstack.completed` Inngest event |
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
- `status`: `draft → queued → processing → completed | failed`
- `script`: `{ video_style, tone, scenes[], cta }` where each scene has `{ role, duration, script, visual_direction }`
- `videoUrl` / `generatedVideoUrl`: final Cloudinary URL of the composed video
- `avatarClipUrl`: Cloudinary URL of the Creatify Aurora talking-head clip
- `brollClipUrls[]`: Cloudinary URLs of Kling 2.5 b-roll clips (one per image)
- `renderId`: Shotstack render ID
- `scenePlan`: output of `planScenes()` — maps images to scenes with Kling prompts
- `generationEngine`: e.g. `"creatify-aurora+kling-2.5+shotstack"`
- `socialPlatforms[]`, `socialStatus`, `scheduledAt`: publishing state
- `analytics`: `{ views, engagement, shares, performanceScore }`

**User** — includes `planTier` (free|pro|business), `credits`, `role` (user|admin), Stripe fields, and notification/preference settings.

**Job** — tracks the active video generation job. Key fields:
- `avatarRequestId`: fal.ai requestId for the Aurora clip
- `brollRequestIds[]` + `brollPlanItems[]`: fal.ai requestIds + metadata per b-roll clip
- `totalClips` / `completedClips`: progress counters (SSE uses these)
- `completedClipUrls[]`: Cloudinary URLs as each clip finishes (for partial preview)
- `renderId`: Shotstack render ID

### Service Layer (`lib/`)

- `ai-service.ts` — `refineVideoIdea()`, `generateScenePrompts()`
- `fal-service.ts` — `generateAvatarClip()`, `generateBrollClip()`, `generateAndUploadAudio()`, `subscribeAvatarClip()` (dev), `subscribeBrollClip()` (dev), `pollFalJobOnce()`
- `shotstack-service.ts` — `composeVideo()`, `composeVideoNoAvatar()`, `getShotstackStatus()`
- `scene-planner.ts` — `planScenes()` — assigns images to scenes, writes Kling prompts via GPT-4o-mini
- `discovery-service.ts` — `generateContentIdeas()`, `generateScriptFromIdea()` (Zod-validated outputs)
- `cloudinary-service.ts` — `uploadVideo()`, `getThumbnailUrl()`
- `inngest/generate-premium-video.ts` — the main Inngest function (durable step orchestration)
- `db.ts` — Mongoose connection with dev hot-reload caching
- `mongodb.ts` — Native MongoDB client (used by NextAuth adapter only)
- `auth-context.tsx` — React context wrapping NextAuth `useSession`

### Video Generation Pipeline

`POST /api/ai-video/generate` → fires `video/generate.requested` → Inngest `generate-premium-video`:

1. `plan-scenes` — GPT-4o-mini assigns each image to a scene, writes Kling prompts (max 3 b-roll clips)
2. `set-processing` — marks Project + Job as processing
3. `generate-audio` — OpenAI TTS or Zonos voice clone → uploaded to fal.ai storage
4. `submit-avatar` — submits to fal.ai Creatify Aurora; writes `avatarRequestId` to DB immediately
5. `submit-broll-N` (parallel) — submits each b-roll to Kling 2.5; writes each `requestId` immediately
6. Parallel `step.waitForEvent` matched by `requestId` — order-independent clip collection
   - Fallback: `step.sleep` + poll via `pollFalJobOnce()` if webhook misses
7. `cloudinary-upload-{type}-N` (parallel) — uploads each clip; pushes URL to `Job.completedClipUrls`
8. `compose-video` — POSTs timeline to Shotstack with captions, music, avatar + b-roll
9. `waitForEvent("shotstack-done")` + fallback poll via `getShotstackStatus()`
10. `upload-final-to-cloudinary` — fetches Shotstack render URL → stores in Cloudinary
11. `persist-result` — writes `completed` + final Cloudinary URL to Project

**Dev mode** (when `NEXTAUTH_URL` contains `localhost`): uses `fal.subscribe()` (synchronous, no webhook) and direct Shotstack polling. No `waitForEvent` needed.

### Auth

NextAuth v5 with JWT strategy. Custom JWT/session callbacks inject `role`, `credits`, and `planTier` into the session. Signup at `POST /api/auth/signup` creates a User with 15 free credits and a bcrypt-hashed password.

### Notable Patterns

- **Credits system**: users spend credits per action; admins can adjust via `/api/admin/users/credits`.
- **Social posting and analytics are currently mocked** in `lib/social-service.ts` and `lib/analytics-service.ts`.
- **Real estate / property mode**: special prompt branch in `refineVideoIdea()` for property tour content.
- **Image uploads**: max 5MB (configured in `next.config.ts` server action body limit).
- **Voice cloning**: `fal-ai/zonos` — reference audio URL stored on the User document.

## Required Environment Variables

```
MONGODB_URI
NEXTAUTH_SECRET
NEXTAUTH_URL                  # Must be publicly reachable (ngrok in dev, real domain in prod)
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
OPENAI_API_KEY
FAL_API_KEY                   # fal.ai — Creatify Aurora + Kling 2.5
SHOTSTACK_API_KEY
SHOTSTACK_ENV                 # "stage" for dev, "production" for prod
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
INNGEST_EVENT_KEY             # Required in production (Inngest Cloud)
INNGEST_SIGNING_KEY           # Required in production (Inngest Cloud)
WEBHOOK_SECRET                # Shared secret for fal + Shotstack webhook auth
APIFY_API_TOKEN               # Web scraping (optional, not core path)
```
