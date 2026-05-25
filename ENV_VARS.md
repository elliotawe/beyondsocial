# Environment Variables

All variables below must be set in `.env.local` (and in your production environment).

---

## Required — Existing

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (Atlas or self-hosted) |
| `NEXTAUTH_SECRET` | NextAuth.js JWT signing secret |
| `NEXTAUTH_URL` | Full base URL of the app, e.g. `https://yourdomain.com` — **also used to build webhook callback URLs** |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `OPENAI_API_KEY` | OpenAI API key — used for GPT-4o-mini script refinement, scene planning, portrait detection |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `DASHSCOPE_API_KEY` | DashScope (Wan AI) key — kept for legacy; no longer used in the active video pipeline |
| `APIFY_API_TOKEN` | Apify token for web scraping (optional, non-critical path) |

---

## Required — New (Premium Video Pipeline)

| Variable | Description |
|---|---|
| `FAL_API_KEY` | fal.ai API key — used for both **Creatify Aurora** (talking head) and **Kling 2.5 Turbo Pro** (b-roll). Get it at [fal.ai](https://fal.ai) |
| `SHOTSTACK_API_KEY` | Shotstack production API key — used to compose the final video. Get it at [shotstack.io](https://shotstack.io) |
| `SHOTSTACK_ENV` | `production` or `stage`. Use `stage` for testing to avoid production render costs |
| `CREATIFY_AURORA_MODEL` | fal.ai model string for Creatify Aurora. Default: `fal-ai/creatify/aurora` — verify the exact string in the [fal.ai model catalogue](https://fal.ai/models) |
| `KLING_MODEL` | fal.ai model string for Kling 2.5 Turbo Pro. Default: `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` — verify in the fal.ai catalogue |

---

## Required — Inngest

| Variable | Description |
|---|---|
| `INNGEST_EVENT_KEY` | Inngest event key for your app — used to authenticate incoming events in production. Set in [inngest.com](https://app.inngest.com) dashboard |
| `INNGEST_SIGNING_KEY` | Inngest signing key — used to verify that webhook payloads come from Inngest. Set in [inngest.com](https://app.inngest.com) dashboard |
| `WEBHOOK_SECRET` | Shared secret appended as `?secret=` to both the fal.ai and Shotstack webhook callback URLs. Any random string works — e.g. `openssl rand -hex 32`. Prevents spoofed webhook events in production. |

> In development, Inngest Dev Server auto-discovers your functions at `http://localhost:3000/api/inngest` — no keys needed locally.

---

## Webhook Registration

After deployment, register these two webhook URLs:

| Service | Webhook URL to register | Where to configure |
|---|---|---|
| fal.ai | `https://<your-domain>/api/webhooks/fal` | fal.ai dashboard → Webhooks, or pass as `webhookUrl` in fal.ai API calls |
| Shotstack | `https://<your-domain>/api/webhooks/shotstack` | Shotstack dashboard → Settings → Webhook, or set `callback` in the render payload |

---

## Example `.env.local`

```bash
# Auth
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# AI
OPENAI_API_KEY=sk-...

# Media Storage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Legacy (kept for existing records)
DASHSCOPE_API_KEY=...

# New — fal.ai
FAL_API_KEY=...
CREATIFY_AURORA_MODEL=fal-ai/creatify/aurora
KLING_MODEL=fal-ai/kling-video/v2.5-turbo/pro/image-to-video

# New — Shotstack
SHOTSTACK_API_KEY=...
SHOTSTACK_ENV=stage

# Webhook security (generate with: openssl rand -hex 32)
WEBHOOK_SECRET=your-random-secret-here

# Inngest (not needed in local dev)
# INNGEST_EVENT_KEY=...
# INNGEST_SIGNING_KEY=...
```
