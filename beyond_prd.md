# Beyond – Product Requirements Document (PRD)

## Product Name
**Beyond**

## Overview
Beyond is a subscription-based AI social media tool that enables users to generate realistic short-form social videos using AI, refine them with an in-browser editor, and publish them with optimized captions, hashtags, and scheduling — all from a single dashboard.

---

## Routing & Access Model

- `/` → Public landing page  
- `/login` → Authentication (mini landing + login)  
- `/dashboard` → Authenticated app root  
- `/dashboard/*` → All product features  

Unauthenticated users can only access `/` and `/login`. All AI functionality requires authentication and an active subscription.

---

## Subscription & Pricing Model

- Monthly subscription plans
- Each plan includes a fixed number of video credits
- Credits reset monthly
- 1 credit = 1 video generation
- Stripe used for billing

---

## Core User Flow

1. User signs up / logs in
2. User enters dashboard
3. User creates a new video project
4. User inputs rough idea + uploads images
5. AI refines script (GPT-4.1)
6. Video is generated (Wan AI 2.6)
7. User edits video in-browser
8. Captions, hashtags, and schedule are generated
9. User downloads or schedules video

---

## AI Refinement Engine

**Model:** GPT-4.1 (OpenAI)

**Purpose:** Convert rough user ideas into structured, social-optimized video instructions.

### Output Schema (JSON)
```json
{
  "video_style": "ugc_talking_head",
  "tone": "casual",
  "scenes": [
    {
      "scene_id": 1,
      "role": "hook",
      "duration_seconds": 3,
      "script": "Relatable hook",
      "visual_direction": "Vertical, natural lighting"
    }
  ],
  "cta": "Link in bio"
}
```

---

## Video Generation Engine

**Model:** Wan AI 2.6  
**Mode:** Image-to-video  
**Max Length:** 15 seconds  
**Aspect Ratio:** 9:16 (vertical)

### Internal Cost Reference
- 720p: $0.10 / second  
- 1080p: $0.15 / second  

Credits are deducted before generation begins.

---

## Video Orchestration

Job states:
```
CREATED → REFINING → GENERATING → COMPLETE → FAILED
```

Responsibilities:
- Accept GPT-4.1 structured output
- Convert scenes into Wan AI-compatible requests
- Handle async jobs, retries, and failures

---

## In-Browser Editor

Features:
- Timeline-based trimming
- Scene reordering
- Caption editing
- Auto subtitles
- Scene regeneration

Rules:
- Full regeneration consumes credit
- Caption edits are free

---

## Captions & Hashtags

Generated automatically using GPT-4.1 (or mini variant).

```json
{
  "caption": "Short engaging caption",
  "hashtags": ["#ugc", "#smallbusiness", "#ai"]
}
```

---

## Scheduling & Optimization

- AI recommends best posting times
- Platform-specific optimization
- Initial support for TikTok, Instagram, Facebook

---

## Backend & Infrastructure

- Supabase (Postgres + Auth)
- Stripe (subscriptions)
- VPS hosting (client-provided)

Core tables:
- users
- profiles
- subscriptions
- credits
- projects
- video_jobs

---

## Non-Functional Requirements

- Refinement response < 10s
- Async video generation
- Secure image handling
- Explicit consent for human likeness

---

## Out of Scope (v1)

- Long-form video
- Advanced analytics
- Team collaboration
- Model fine-tuning

---

## Positioning

Beyond is positioned as a **digital AI-powered social media manager** that prioritizes realism, simplicity, and speed.
