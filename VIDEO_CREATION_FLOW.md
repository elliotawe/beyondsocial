# Video Creation Flow — Technical Reference

> Entry point: `app/dashboard/create/page.tsx` → renders `<VideoCreator />`

---

## Overview

The creation flow is a 5-step wizard driven by a single `step` integer in `VideoCreator` state (`0–4`). Steps 0–2 collect user input; steps 3–4 are async/completion states. All state lives in `VideoCreator` — child components communicate upward via callbacks.

```
Step 0  Discovery      DiscoveryStep component
Step 1  Brief & Media  Inline in VideoCreator
Step 2  Script Editor  Inline in VideoCreator
Step 3  Rendering      Inline loading state, polling loop
Step 4  Done           Video player + captions + hashtags
```

---

## Step 0 — Discovery (`DiscoveryStep`)

**File:** `components/dashboard/discovery-step.tsx`

The user picks one of two modes from a home screen, then gets forwarded into the brief.

### Mode A: Trend Explorer
1. User types a topic → `GET /api/tiktok-search?q=<topic>`
2. Results render as `VideoCard` grid (thumbnail, stats, hashtags).
3. User clicks "Use as inspiration" on a card → `handleUseVideo()`:
   - Builds a brief object from the video's metadata (no extra API call, no credits).
   - Calls `onSelectBrief({ industry, concept, hook, idea })` → `VideoCreator.handleSelectBrief()`.

### Mode B: Idea Refiner (2-phase)
**Phase 1** — User pastes a rough idea → `POST /api/refine-idea` with `{ idea, phase: 1 }`:
- Returns `{ topic, audience, angle, questions[] }`.
- Renders 2–3 multiple-choice clarifying questions.

**Phase 2** — User answers questions → `POST /api/refine-idea` with `{ idea, phase: 2, answers }`:
- Returns a `RefinedBrief`: `{ hook, scriptOutline[], titleVariations[], hashtags[], videoLength, suggestedSearch }`.
- User clicks "Use this brief" → `handleUseBrief()` → `onSelectBrief(...)` with `suggestedScript` set to the outline.

### Callback contract (`onSelectBrief`)
```ts
{
  industry: string;       // used for Real Estate mode detection & credit prompts
  concept: string;        // short title
  hook: string;           // opening line
  idea: string;           // multi-line context injected into the brief textarea
  suggestedScript?: string; // optional outline from Idea Refiner, passed to GPT
}
```

`VideoCreator.handleSelectBrief` sets all state, flags `realEstateMode` if `industry === "Real Estate"`, then advances to `step = 1`.

---

## Step 1 — Brief & Media

**File:** `components/dashboard/video-creator.tsx` (inline JSX, `step === 1`)

User configures:

| Field | Options | Default |
|---|---|---|
| Style | Cinematic, Vlog, Luxury, Minimalist, Vibrant, Cyberpunk, Documentary, Futuristic | `cinematic` |
| Tone | Professional, Humorous, Inspiring, Urgent, Relatable, Mysterious, Hype, Calm | `professional` |
| Voice | Standard AI / Cloned Voice toggle | off |
| Video Idea textarea | Pre-filled from discovery or typed manually | — |

### Image Upload
- Input accepts `image/*`, `video/mp4`, `video/quicktime`.
- Client-side validation before upload:
  - Images: max 5 MB, dimensions 240px–7680px (checked via an `<img>` element + `URL.createObjectURL`).
  - Videos: max 15 MB.
- Each file is read as a base64 Data URL and `POST`ed to `/api/upload/image` → returns a Cloudinary URL.
- Multiple files upload in parallel via `Promise.all`.
- Thumbnails shown inline; user can remove individual uploads.

### Refine Script (`handleRefine`)
Triggered by the "Refine Script" button (or `Enter` in textarea when image is present). Costs **1 credit**.

1. `POST /api/projects` → creates a `draft` Project in MongoDB → returns `projectId`.
2. `POST /api/ai-video/refine` with `{ idea, style, tone, industry, realEstateMode, suggestedScript }` → returns `RefinedScript`.
3. `PATCH /api/projects/:id` → attaches the script to the Project.
4. Advances to `step = 2`.

---

## Step 2 — Script Editor

**File:** `components/dashboard/video-creator.tsx` (inline JSX, `step === 2`)

Displays the `RefinedScript` as editable scene cards + a CTA block.

### RefinedScript shape (`lib/ai-service.ts`)
```ts
{
  video_style: string;
  tone: string;
  scenes: {
    scene_id: number;
    role: "hook" | "intro" | "body" | "value" | "cta" | "outro";
    duration_seconds: number;
    script: string;           // voiceover text — editable
    visual_direction: string; // camera/lighting directions for Wan AI — editable
  }[];
  cta: string;
}
```

### Scene card colour coding
| Role | Accent colour |
|---|---|
| hook / intro | Amber |
| body / value | Blue |
| cta / outro | Primary |

Both `script` and `visual_direction` fields are inline-editable `<Textarea>` elements that update local state via `updateScene(index, field, value)`.

### Save Draft
`PATCH /api/projects/:id` with the current script + uploaded images. Non-blocking (does not advance step).

### Generate Video (`handleGenerate`)
Costs **3 credits**.

1. `PATCH /api/projects/:id` — syncs latest edits.
2. Builds a `prompt` string: `Style: X. Tone: Y. <all visual_direction strings joined>`.
3. `POST /api/ai-video/generate` with `{ imageUrl: uploadedImages[0], prompt, scriptData }`:
   - Server deducts 3 credits.
   - Calls `aiService.generateWanVideo()` → submits to DashScope Wan 2.6 Flash (720P, 10s, async).
   - Creates a `Job` record in MongoDB.
   - Returns `{ projectId, taskId }`.
4. Advances to `step = 3`, kicks off `pollStatus(projectId)`.

> **Note:** Only `uploadedImages[0]` is sent to Wan AI even if multiple were uploaded.

---

## Step 3 — Rendering (Polling)

**File:** `components/dashboard/video-creator.tsx` (inline JSX, `step === 3`)

`pollStatus(projectId)` runs `setInterval` every **3 seconds**, calling `GET /api/ai-video/status/:projectId`.

### Status endpoint behaviour
1. Looks up the Project in MongoDB.
2. If `status === "processing"` and `taskId` exists, calls `aiService.getWanVideoStatus(taskId)`.
3. On `SUCCEEDED`:
   - Uploads the Wan AI video URL to Cloudinary (permanent storage).
   - Updates Project: `status = "completed"`, stores Cloudinary URL.
   - Returns `{ status: "completed", videoUrl, script }`.
4. On `FAILED`: updates Project status, returns `{ status: "failed" }`.
5. Otherwise returns current DB status.

When the client receives `status === "completed"`, it:
- Clears the interval.
- Sets `generatedVideo` URL.
- Calls `fetchCaptionsAndHashtags(script)` → `POST /api/ai-video/captions`.
- Advances to `step = 4`.

On `failed`, the interval clears, an error banner appears, and the user is told credits were refunded (actual refund logic is in `lib/credits.ts`).

---

## Step 4 — Done

**File:** `components/dashboard/video-creator.tsx` (inline JSX, `step === 4`)

Displays:
- `<video>` player with the Cloudinary URL.
- **Open Editor** → mounts `<VideoEditor>` overlay (`components/dashboard/video-editor/index.tsx`).
- **Download** → direct `<a href download>` link.
- **Share** → button (currently no-op / placeholder).
- **Captions panel** — up to N platform-specific captions (`select-all` text for copy-paste).
- **Hashtags panel** — badge list, labelled "1 credit" (captions are generated alongside hashtags in a single call).
- **Generation Details sidebar** — hardcoded: 1080×1920 9:16, Wan AI 2.6 Flash, 15 seconds.
- **Create Another Video** → `resetCreator()` returns everything to `step = 0`.

### Caption / Hashtag generation (`fetchCaptionsAndHashtags`)
`POST /api/ai-video/captions` with `{ script, industry, platforms: ["TikTok","Instagram","LinkedIn"] }`.
- Returns `{ captions[], hashtags[], creditsRemaining }`.
- On failure, falls back to `scenes[0].script` + `cta` as captions and generic hashtags.

---

## Credit costs

| Action | Cost |
|---|---|
| Script refinement (`/api/ai-video/refine`) | 1 credit |
| Video generation (`/api/ai-video/generate`) | 3 credits |
| Captions + hashtags (`/api/ai-video/captions`) | 1 credit |

New users start with **5 free credits** (set at signup in `/api/auth/signup`). Credits are managed in `lib/credits.ts`; failed video generation triggers an automatic refund.

---

## Key files at a glance

| Path | Purpose |
|---|---|
| `app/dashboard/create/page.tsx` | Route entry point |
| `components/dashboard/video-creator.tsx` | Wizard shell + steps 1–4 state |
| `components/dashboard/discovery-step.tsx` | Step 0 — Trend Explorer + Idea Refiner |
| `components/dashboard/video-editor/index.tsx` | Post-generation editor overlay |
| `app/api/ai-video/refine/route.ts` | GPT-4o-mini script refinement |
| `app/api/ai-video/generate/route.ts` | Wan AI job submission + credit deduction |
| `app/api/ai-video/status/[projectId]/route.ts` | Job polling + Cloudinary migration |
| `app/api/ai-video/captions/route.ts` | Caption + hashtag generation |
| `app/api/tiktok-search/route.ts` | TikTok trend search |
| `app/api/refine-idea/route.ts` | Two-phase idea analysis |
| `app/api/upload/image/route.ts` | Client image → Cloudinary |
| `lib/ai-service.ts` | `refineVideoIdea`, `generateWanVideo`, `getWanVideoStatus` |
| `lib/discovery-service.ts` | `generateContentIdeas`, `generateScriptFromIdea` |
| `lib/cloudinary-service.ts` | `uploadVideo`, `getThumbnailUrl` |
| `lib/credits.ts` | `deductCredits`, `refundCredits` |
| `models/Project.ts` | Central data entity |
| `models/Job.ts` | Async job tracker |

---

## Data flow diagram

```
User
 │
 ├─[Step 0]─► DiscoveryStep
 │             ├─ Trend Explorer ──► GET /api/tiktok-search
 │             └─ Idea Refiner ───► POST /api/refine-idea (phase 1 + 2)
 │                                   └─► onSelectBrief()
 │
 ├─[Step 1]─► Brief + Image Upload
 │             ├─ POST /api/upload/image ──► Cloudinary (immediate)
 │             └─ handleRefine()
 │                 ├─ POST /api/projects ──────────────────► MongoDB draft
 │                 └─ POST /api/ai-video/refine ──► GPT-4o-mini ──► RefinedScript
 │                     └─ PATCH /api/projects/:id ──► MongoDB
 │
 ├─[Step 2]─► Script Editor (in-browser edits)
 │             └─ handleGenerate()
 │                 ├─ PATCH /api/projects/:id ──► sync edits
 │                 └─ POST /api/ai-video/generate
 │                     ├─ deductCredits (3)
 │                     ├─ generateWanVideo() ──► DashScope API ──► taskId
 │                     └─ Job record ──► MongoDB
 │
 ├─[Step 3]─► Polling (3s interval)
 │             └─ GET /api/ai-video/status/:projectId
 │                 ├─ getWanVideoStatus(taskId) ──► DashScope
 │                 └─ on SUCCEEDED: uploadVideo() ──► Cloudinary
 │                                  PATCH Project (completed, cloudinaryUrl)
 │
 └─[Step 4]─► Done
               ├─ POST /api/ai-video/captions ──► GPT (captions + hashtags)
               ├─ VideoEditor overlay (optional)
               └─ Download / Share
```

---

## Special cases

### Real Estate mode
Triggered when `industry === "Real Estate"` comes from `onSelectBrief`. A `realEstateMode: true` flag is sent to `/api/ai-video/refine`, which adds an agent-avatar prompt injection in `refineVideoIdea()` — scenes alternate between property shots and an on-screen agent segment.

### Learning loop
`refineVideoIdea()` queries MongoDB for the user's past projects with `socialStatus === "posted"` and `performanceScore >= 70`. The top 2 scripts are injected into the GPT system prompt as examples, so future scripts improve over time.

### Multi-image upload
The UI allows multiple images to be uploaded and displays all thumbnails, but only `uploadedImages[0]` is sent to Wan AI for generation. The rest are stored on the Project record for reference.

### Wan AI fallback URL
If Cloudinary migration fails on the status endpoint, the raw Wan AI `videoUrl` is used as a fallback. The UI handles both transparently via `videoUrl` in the poll response.
