import { inngest } from "@/inngest";
import { planScenes } from "@/lib/scene-planner";
import {
  generateAvatarClip, generateBrollClip,
  generateAndUploadAudio, generateAudioWithClonedVoice,
  subscribeAvatarClip, subscribeBrollClip, pollFalJobOnce,
} from "@/lib/fal-service";
import { composeVideo, composeVideoNoAvatar, getShotstackStatus } from "@/lib/shotstack-service";
import { refundCredits } from "@/lib/credits";
import * as cloudinaryService from "@/lib/cloudinary-service";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { Job } from "@/models/Job";
import type { RefinedScript } from "@/lib/ai-service";

interface GenerateRequestedData {
  projectId: string;
  jobId: string;
  userId: string;
  images: string[];
  videoType: "person" | "product" | "property";
  portraitImageUrl?: string;
  refinedScript: RefinedScript;
  industry: string;
  style: string;
  tone: string;
  voice?: string;
  clonedVoiceUrl?: string;
}

interface ClipCompletedData {
  projectId: string;
  requestId: string;
  rawVideoUrl?: string;
  type: "avatar" | "broll";
  order?: number;
  durationSeconds?: number;
  error?: boolean;
}

interface ShotstackCompletedData {
  projectId: string;
  videoUrl?: string;
  error?: boolean;
}

interface ResolvedClip {
  cloudinaryUrl: string;
  type: "avatar" | "broll";
  order: number;
  durationSeconds: number;
}

function friendlyError(msg: string): string {
  if (/forbidden/i.test(msg)) return "Video generation service is temporarily unavailable. Please try again shortly.";
  if (/timed?\s*out/i.test(msg)) return "Generation took too long and was cancelled. Please try again.";
  if (/not configured/i.test(msg)) return "A configuration error occurred on our end. Please try again or contact support.";
  if (/credits/i.test(msg)) return "You don't have enough credits to generate this video.";
  return "Video generation failed unexpectedly. Please try again.";
}

// True when running locally — fal/Shotstack webhooks can't reach localhost.
function isDevMode(): boolean {
  return (process.env.NEXTAUTH_URL ?? "").includes("localhost");
}

const AVATAR_MODEL = () => process.env.CREATIFY_AURORA_MODEL ?? "fal-ai/creatify/aurora";
const BROLL_MODEL = () => process.env.KLING_MODEL ?? "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";

// ─── Shotstack fallback poll ──────────────────────────────────────────────────
// Called when the Shotstack webhook is missed (unreachable URL or network blip).
// Uses step.sleep so the Inngest function stays durable across the poll window.
async function shotstackFallbackPoll(
  step: Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"],
  renderId: string,
  maxAttempts = 20
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await step.sleep(`shotstack-poll-sleep-${attempt}`, "30s");
    const pollResult = await step.run(`shotstack-poll-${attempt}`, async () => {
      await connectDB();
      return getShotstackStatus(renderId);
    });
    if (pollResult.status === "done" && pollResult.url) return pollResult.url;
    if (pollResult.status === "failed") return null;
  }
  return null;
}

// ─── fal.ai fallback poll ─────────────────────────────────────────────────────
// Called when a clip's webhook event times out in production.
// Polls fal.ai directly with step.sleep between attempts.
async function falFallbackPoll(
  step: Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"],
  model: string,
  requestId: string,
  stepPrefix: string,
  maxAttempts = 10
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await step.sleep(`${stepPrefix}-sleep-${attempt}`, "30s");
    const result = await step.run(`${stepPrefix}-check-${attempt}`, async () => {
      return pollFalJobOnce(model, requestId);
    });
    if (result && result !== "FAILED") return result;
    if (result === "FAILED") return null;
  }
  return null;
}

export const generatePremiumVideo = inngest.createFunction(
  {
    id: "generate-premium-video",
    concurrency: { key: "event.data.userId", limit: 2 },
    // retries: 0 because waitForEvent consumes events — replaying a retry would miss them.
    retries: 0,
    triggers: [{ event: "video/generate.requested" }],
  },
  async ({ event, step }) => {
    const {
      projectId,
      jobId,
      userId,
      images,
      videoType = "person",
      portraitImageUrl,
      refinedScript,
      industry,
      style,
      tone,
      voice,
      clonedVoiceUrl,
    } = event.data as GenerateRequestedData;

    const dev = isDevMode();

    try {
      await connectDB();

      console.log(`[Inngest][${projectId}] ▶ generate-premium-video started`, {
        jobId, userId, imageCount: images.length, videoType, industry, style, tone, voice, dev,
        sceneCount: refinedScript?.scenes?.length,
      });

      // STEP 1: Plan scenes
      const scenePlan = await step.run("plan-scenes", async () => {
        console.log(`[Inngest][${projectId}] Step 1: planning scenes`);
        const plan = await planScenes({ images, refinedScript, industry, style, tone, videoType, portraitImageUrl });
        console.log(`[Inngest][${projectId}] Step 1 ✓`, {
          brollCount: plan.brollPlan.length,
          totalDurationSeconds: plan.totalDurationSeconds,
        });
        return plan;
      });

      // STEP 2: Mark project as processing
      await step.run("set-processing", async () => {
        await connectDB();
        await Project.findByIdAndUpdate(projectId, { status: "processing", scenePlan });
        await Job.findByIdAndUpdate(jobId, { status: "processing" });
        console.log(`[Inngest][${projectId}] Step 2 ✓ project marked processing`);
      });

      // ─── PERSON VIDEO ────────────────────────────────────────────────────────

      if (videoType === "person") {

        // STEP 3a: Generate audio
        const audioUrl = await step.run("generate-audio", async () => {
          const useCloned = voice === "cloned" && !!clonedVoiceUrl;
          console.log(`[Inngest][${projectId}] Step 3a: generating audio`, { useCloned });
          const url = useCloned
            ? await generateAudioWithClonedVoice(clonedVoiceUrl!, scenePlan.fullVoiceoverScript)
            : await generateAndUploadAudio(scenePlan.fullVoiceoverScript, voice ?? "nova");
          console.log(`[Inngest][${projectId}] Step 3a ✓ audioUrl=${url}`);
          return url;
        });

        // STEP 3b: Submit avatar — write requestId to DB immediately before any webhook fires.
        // In dev mode, subscribe synchronously (no webhook needed).
        const avatarSubmit = await step.run("submit-avatar", async () => {
          await connectDB();
          if (dev) {
            console.log(`[Inngest][${projectId}] Step 3b (dev): subscribing avatar synchronously`);
            const rawUrl = await subscribeAvatarClip({
              portraitUrl: scenePlan.portraitImageUrl,
              audioUrl,
            });
            console.log(`[Inngest][${projectId}] Step 3b (dev) ✓ avatar rawUrl=${rawUrl}`);
            return { mode: "sync" as const, rawUrl };
          }
          console.log(`[Inngest][${projectId}] Step 3b (prod): submitting avatar via webhook`);
          const result = await generateAvatarClip({
            portraitUrl: scenePlan.portraitImageUrl,
            audioUrl,
            durationSeconds: scenePlan.totalDurationSeconds,
          });
          // Write requestId to DB immediately — webhook may arrive before this step returns.
          await Job.findByIdAndUpdate(jobId, { avatarRequestId: result.requestId });
          console.log(`[Inngest][${projectId}] Step 3b ✓ avatarRequestId=${result.requestId}`);
          return { mode: "webhook" as const, requestId: result.requestId };
        });

        // STEP 3c: Submit b-roll clips in parallel — each writes its requestId immediately.
        const brollSubmits = await Promise.all(
          scenePlan.brollPlan.map((scene, i) =>
            step.run(`submit-broll-${i}`, async () => {
              await connectDB();
              if (dev) {
                console.log(`[Inngest][${projectId}] Step 3c-${i} (dev): subscribing broll order=${scene.order}`);
                const rawUrl = await subscribeBrollClip({
                  imageUrl: scene.imageUrl,
                  prompt: scene.klingPrompt,
                  durationSeconds: scene.durationSeconds,
                });
                console.log(`[Inngest][${projectId}] Step 3c-${i} (dev) ✓ broll rawUrl=${rawUrl}`);
                return { mode: "sync" as const, rawUrl, order: scene.order, durationSeconds: scene.durationSeconds, imageUrl: scene.imageUrl };
              }
              const result = await generateBrollClip({
                imageUrl: scene.imageUrl,
                prompt: scene.klingPrompt,
                durationSeconds: scene.durationSeconds,
                aspectRatio: "9:16",
              });
              const planItem = { requestId: result.requestId, imageUrl: scene.imageUrl, order: scene.order, durationSeconds: scene.durationSeconds };
              await Job.findByIdAndUpdate(jobId, {
                $push: { brollRequestIds: result.requestId, brollPlanItems: planItem },
              });
              console.log(`[Inngest][${projectId}] Step 3c-${i} ✓ broll order=${scene.order} requestId=${result.requestId}`);
              return { mode: "webhook" as const, requestId: result.requestId, order: scene.order, durationSeconds: scene.durationSeconds, imageUrl: scene.imageUrl };
            })
          )
        );

        const totalClips = 1 + brollSubmits.length;
        await step.run("set-total-clips", async () => {
          await connectDB();
          await Job.findByIdAndUpdate(jobId, { totalClips, completedClips: 0 });
        });

        // ─── Collect raw video URLs (dev: already have them; prod: wait for webhooks) ──

        type RawClip = { rawUrl: string; type: "avatar" | "broll"; order: number; durationSeconds: number };
        const rawClips: RawClip[] = [];

        if (dev) {
          // Dev mode: synchronous subscribe already returned the URLs
          if (avatarSubmit.mode === "sync" && avatarSubmit.rawUrl) {
            rawClips.push({ rawUrl: avatarSubmit.rawUrl, type: "avatar", order: 0, durationSeconds: scenePlan.totalDurationSeconds });
          } else {
            await step.run("handle-avatar-sync-failure", async () => {
              await connectDB();
              await refundCredits(userId, "video_generation", projectId);
              await Project.findByIdAndUpdate(projectId, { status: "failed", error: "Avatar clip generation failed in dev mode." });
              await Job.findByIdAndUpdate(jobId, { status: "failed" });
            });
            return;
          }
          for (const bs of brollSubmits) {
            if (bs.mode === "sync" && bs.rawUrl) {
              rawClips.push({ rawUrl: bs.rawUrl, type: "broll", order: bs.order, durationSeconds: bs.durationSeconds });
            }
          }
        } else {
          // Prod mode: wait for all webhook events in parallel, each matched by requestId.
          // This is safe regardless of delivery order — each event is routed to its own step.
          const webhookBrollSubmits = brollSubmits.filter(bs => bs.mode === "webhook") as Array<{
            mode: "webhook"; requestId: string; order: number; durationSeconds: number;
          }>;
          const avatarReqId = (avatarSubmit as { mode: "webhook"; requestId: string }).requestId;

          const [avatarEvent, ...brollEvents] = await Promise.all([
            step.waitForEvent("clip-avatar", {
              event: "video/clip.completed",
              if: `async.data.projectId == "${projectId}" && async.data.requestId == "${avatarReqId}"`,
              timeout: "15m",
            }),
            ...webhookBrollSubmits.map(bs =>
              step.waitForEvent(`clip-broll-${bs.order}`, {
                event: "video/clip.completed",
                if: `async.data.projectId == "${projectId}" && async.data.requestId == "${bs.requestId}"`,
                timeout: "15m",
              })
            ),
          ]);

          // Handle avatar result
          if (!avatarEvent) {
            console.warn(`[Inngest][${projectId}] Avatar webhook timed out — trying fallback poll`);
            const url = await falFallbackPoll(step, AVATAR_MODEL(), avatarReqId, "fal-fallback-avatar");
            if (!url) {
              await step.run("handle-avatar-timeout", async () => {
                await connectDB();
                await refundCredits(userId, "video_generation", projectId);
                await Project.findByIdAndUpdate(projectId, { status: "failed", error: "Avatar clip generation timed out." });
                await Job.findByIdAndUpdate(jobId, { status: "failed" });
              });
              return;
            }
            rawClips.push({ rawUrl: url, type: "avatar", order: 0, durationSeconds: scenePlan.totalDurationSeconds });
          } else {
            const avatarData = avatarEvent.data as ClipCompletedData;
            if (avatarData.error || !avatarData.rawVideoUrl) {
              await step.run("handle-avatar-failure", async () => {
                await connectDB();
                await refundCredits(userId, "video_generation", projectId);
                await Project.findByIdAndUpdate(projectId, { status: "failed", error: "Avatar clip generation failed." });
                await Job.findByIdAndUpdate(jobId, { status: "failed" });
              });
              return;
            }
            rawClips.push({ rawUrl: avatarData.rawVideoUrl, type: "avatar", order: 0, durationSeconds: scenePlan.totalDurationSeconds });
          }

          // Handle b-roll results
          for (let i = 0; i < webhookBrollSubmits.length; i++) {
            const bs = webhookBrollSubmits[i];
            const ev = brollEvents[i];
            if (!ev) {
              console.warn(`[Inngest][${projectId}] B-roll order=${bs.order} timed out — trying fallback poll`);
              const url = await falFallbackPoll(step, BROLL_MODEL(), bs.requestId, `fal-fallback-broll-${bs.order}`);
              if (url) rawClips.push({ rawUrl: url, type: "broll", order: bs.order, durationSeconds: bs.durationSeconds });
            } else {
              const brollData = ev.data as ClipCompletedData;
              if (!brollData.error && brollData.rawVideoUrl) {
                rawClips.push({ rawUrl: brollData.rawVideoUrl, type: "broll", order: bs.order, durationSeconds: bs.durationSeconds });
              }
            }
          }
        }

        // Validate we have an avatar
        if (!rawClips.some(c => c.type === "avatar")) {
          await step.run("handle-no-avatar", async () => {
            await connectDB();
            await refundCredits(userId, "video_generation", projectId);
            await Project.findByIdAndUpdate(projectId, { status: "failed", error: "No avatar clip was generated." });
            await Job.findByIdAndUpdate(jobId, { status: "failed" });
          });
          return;
        }

        const brollRawClips = rawClips.filter(c => c.type === "broll");
        if (brollRawClips.length === 0 && scenePlan.brollPlan.length > 0) {
          await step.run("handle-no-broll", async () => {
            await connectDB();
            await refundCredits(userId, "video_generation", projectId);
            await Project.findByIdAndUpdate(projectId, { status: "failed", error: "All b-roll clips failed to generate." });
            await Job.findByIdAndUpdate(jobId, { status: "failed" });
          });
          return;
        }

        // STEP 5: Upload each clip to Cloudinary in parallel.
        // Each upload also pushes to Job.completedClipUrls for partial preview.
        const resolvedClips: ResolvedClip[] = await Promise.all(
          rawClips.map(clip =>
            step.run(`cloudinary-upload-${clip.type}-${clip.order}`, async () => {
              await connectDB();
              console.log(`[Inngest][${projectId}] Uploading ${clip.type} order=${clip.order} to Cloudinary`);
              const uploaded = await cloudinaryService.uploadVideo(clip.rawUrl, {
                folder: "beyond-social/clips",
                tags: [clip.type, "ai-generated"],
              });
              const url = uploaded.secure_url;
              console.log(`[Inngest][${projectId}] Cloudinary ✓ ${clip.type} order=${clip.order} → ${url}`);
              // Push to completedClipUrls for partial preview; increment counter by 1.
              await Job.findByIdAndUpdate(jobId, {
                $push: { completedClipUrls: url },
                $inc: { completedClips: 1 },
              });
              return { cloudinaryUrl: url, type: clip.type, order: clip.order, durationSeconds: clip.durationSeconds } as ResolvedClip;
            })
          )
        );

        const avatarClip = resolvedClips.find(c => c.type === "avatar")!;
        const brollClips = resolvedClips.filter(c => c.type === "broll").sort((a, b) => a.order - b.order);

        // STEP 6: Compose with Shotstack
        const composition = await step.run("compose-video", async () => {
          await connectDB();
          console.log(`[Inngest][${projectId}] Step 6: composing via Shotstack (with avatar)`);
          const result = await composeVideo({
            avatarClipUrl: avatarClip.cloudinaryUrl,
            brollClips: brollClips.map(c => ({ url: c.cloudinaryUrl, durationSeconds: c.durationSeconds, order: c.order })),
            scenes: refinedScript.scenes,
            industry,
            style,
          });
          console.log(`[Inngest][${projectId}] Step 6 ✓ renderId=${result.renderId}`);
          await Job.findByIdAndUpdate(jobId, { renderId: result.renderId });
          await Project.findByIdAndUpdate(projectId, { renderId: result.renderId });
          return result;
        });

        // STEP 7: Wait for Shotstack webhook, with fallback polling if it misses.
        let shotstackVideoUrl: string | null = null;

        if (!dev) {
          const shotstackDone = await step.waitForEvent("shotstack-done", {
            event: "video/shotstack.completed",
            match: "data.projectId",
            timeout: "10m",
          });

          if (shotstackDone) {
            const ssData = shotstackDone.data as ShotstackCompletedData;
            if (ssData.error || !ssData.videoUrl) {
              await step.run("handle-shotstack-failure", async () => {
                await connectDB();
                await refundCredits(userId, "video_generation", projectId);
                await Project.findByIdAndUpdate(projectId, { status: "failed", error: `Shotstack composition failed. renderId: ${composition.renderId}` });
                await Job.findByIdAndUpdate(jobId, { status: "failed" });
              });
              return;
            }
            shotstackVideoUrl = ssData.videoUrl;
          } else {
            // Webhook missed — fallback poll
            console.warn(`[Inngest][${projectId}] Shotstack webhook timed out — falling back to polling, renderId=${composition.renderId}`);
            shotstackVideoUrl = await shotstackFallbackPoll(step, composition.renderId);
          }
        } else {
          // Dev mode: no webhook — poll directly
          console.log(`[Inngest][${projectId}] Step 7 (dev): polling Shotstack directly`);
          shotstackVideoUrl = await shotstackFallbackPoll(step, composition.renderId);
        }

        if (!shotstackVideoUrl) {
          await step.run("handle-shotstack-timeout", async () => {
            await connectDB();
            await refundCredits(userId, "video_generation", projectId);
            await Project.findByIdAndUpdate(projectId, { status: "failed", error: `Composition timed out. Shotstack renderId: ${composition.renderId}` });
            await Job.findByIdAndUpdate(jobId, { status: "failed" });
          });
          return;
        }

        // STEP 8: Upload final composed video to Cloudinary (not just Shotstack CDN).
        const finalVideoUrl = await step.run("upload-final-to-cloudinary", async () => {
          console.log(`[Inngest][${projectId}] Step 8: uploading final video to Cloudinary`);
          const uploaded = await cloudinaryService.uploadVideo(shotstackVideoUrl!, {
            folder: `beyond-social/projects/${projectId}`,
            tags: ["final", "composed", videoType],
          });
          console.log(`[Inngest][${projectId}] Step 8 ✓ finalUrl=${uploaded.secure_url}`);
          return uploaded.secure_url;
        });

        // STEP 9: Persist result
        await step.run("persist-result", async () => {
          await connectDB();
          console.log(`[Inngest][${projectId}] Step 9 ✓ persisting final video`);
          await Project.findByIdAndUpdate(projectId, {
            status: "completed",
            generatedVideoUrl: finalVideoUrl,
            videoUrl: finalVideoUrl,
            avatarClipUrl: avatarClip.cloudinaryUrl,
            brollClipUrls: brollClips.map(c => c.cloudinaryUrl),
            generationEngine: "creatify-aurora+kling-2.5+shotstack",
          });
          await Job.findByIdAndUpdate(jobId, { status: "completed" });
        });

      } else {

        // ─── PRODUCT / PROPERTY VIDEO (b-roll only + TTS voiceover) ─────────────

        // STEP 3b: Generate TTS audio
        const productAudioUrl = await step.run("generate-audio-product", async () => {
          const useClonedForProduct = voice === "cloned" && !!clonedVoiceUrl;
          console.log(`[Inngest][${projectId}] Step 3b: generating audio for ${videoType}`, { useClonedForProduct });
          const url = useClonedForProduct
            ? await generateAudioWithClonedVoice(clonedVoiceUrl!, scenePlan.fullVoiceoverScript)
            : await generateAndUploadAudio(scenePlan.fullVoiceoverScript, voice ?? "nova");
          console.log(`[Inngest][${projectId}] Step 3b ✓ audioUrl=${url}`);
          return url;
        });

        // STEP 3c: Submit b-roll clips in parallel — each writes its requestId immediately.
        const productBrollSubmits = await Promise.all(
          scenePlan.brollPlan.map((scene, i) =>
            step.run(`submit-product-broll-${i}`, async () => {
              await connectDB();
              if (dev) {
                console.log(`[Inngest][${projectId}] Step 3c-${i} (dev): subscribing product broll order=${scene.order}`);
                const rawUrl = await subscribeBrollClip({
                  imageUrl: scene.imageUrl,
                  prompt: scene.klingPrompt,
                  durationSeconds: scene.durationSeconds,
                });
                return { mode: "sync" as const, rawUrl, order: scene.order, durationSeconds: scene.durationSeconds };
              }
              const result = await generateBrollClip({
                imageUrl: scene.imageUrl,
                prompt: scene.klingPrompt,
                durationSeconds: scene.durationSeconds,
                aspectRatio: "9:16",
              });
              const planItem = { requestId: result.requestId, imageUrl: scene.imageUrl, order: scene.order, durationSeconds: scene.durationSeconds };
              await Job.findByIdAndUpdate(jobId, {
                $push: { brollRequestIds: result.requestId, brollPlanItems: planItem },
              });
              console.log(`[Inngest][${projectId}] Step 3c-${i} ✓ product broll order=${scene.order} requestId=${result.requestId}`);
              return { mode: "webhook" as const, requestId: result.requestId, order: scene.order, durationSeconds: scene.durationSeconds };
            })
          )
        );

        const totalProductClips = productBrollSubmits.length;
        await step.run("set-total-clips-product", async () => {
          await connectDB();
          await Job.findByIdAndUpdate(jobId, { totalClips: totalProductClips, completedClips: 0 });
        });

        type ProductRawClip = { rawUrl: string; order: number; durationSeconds: number };
        const productRawClips: ProductRawClip[] = [];

        if (dev) {
          for (const bs of productBrollSubmits) {
            if (bs.mode === "sync" && bs.rawUrl) {
              productRawClips.push({ rawUrl: bs.rawUrl, order: bs.order, durationSeconds: bs.durationSeconds });
            }
          }
        } else {
          const webhookProductSubmits = productBrollSubmits.filter(bs => bs.mode === "webhook") as Array<{
            mode: "webhook"; requestId: string; order: number; durationSeconds: number;
          }>;

          const productBrollEvents = await Promise.all(
            webhookProductSubmits.map(bs =>
              step.waitForEvent(`clip-product-broll-${bs.order}`, {
                event: "video/clip.completed",
                if: `async.data.projectId == "${projectId}" && async.data.requestId == "${bs.requestId}"`,
                timeout: "15m",
              })
            )
          );

          for (let i = 0; i < webhookProductSubmits.length; i++) {
            const bs = webhookProductSubmits[i];
            const ev = productBrollEvents[i];
            if (!ev) {
              const url = await falFallbackPoll(step, BROLL_MODEL(), bs.requestId, `fal-fallback-product-broll-${bs.order}`);
              if (url) productRawClips.push({ rawUrl: url, order: bs.order, durationSeconds: bs.durationSeconds });
            } else {
              const clipData = ev.data as ClipCompletedData;
              if (!clipData.error && clipData.rawVideoUrl) {
                productRawClips.push({ rawUrl: clipData.rawVideoUrl, order: bs.order, durationSeconds: bs.durationSeconds });
              }
            }
          }
        }

        if (productRawClips.length === 0) {
          await step.run("handle-no-broll-product", async () => {
            await connectDB();
            await refundCredits(userId, "video_generation", projectId);
            await Project.findByIdAndUpdate(projectId, { status: "failed", error: "All b-roll clips failed to generate." });
            await Job.findByIdAndUpdate(jobId, { status: "failed" });
          });
          return;
        }

        // Upload all product clips to Cloudinary in parallel
        const resolvedProductClips: Array<{ cloudinaryUrl: string; order: number; durationSeconds: number }> =
          await Promise.all(
            productRawClips.map(clip =>
              step.run(`cloudinary-upload-product-broll-${clip.order}`, async () => {
                await connectDB();
                const uploaded = await cloudinaryService.uploadVideo(clip.rawUrl, {
                  folder: "beyond-social/clips",
                  tags: ["broll", "ai-generated", videoType],
                });
                const url = uploaded.secure_url;
                await Job.findByIdAndUpdate(jobId, {
                  $push: { completedClipUrls: url },
                  $inc: { completedClips: 1 },
                });
                return { cloudinaryUrl: url, order: clip.order, durationSeconds: clip.durationSeconds };
              })
            )
          );

        const sortedProductClips = resolvedProductClips.sort((a, b) => a.order - b.order);

        // Compose without avatar
        const compositionProduct = await step.run("compose-video-no-avatar", async () => {
          await connectDB();
          console.log(`[Inngest][${projectId}] Step 6b: composing via Shotstack (no avatar)`);
          const result = await composeVideoNoAvatar({
            audioUrl: productAudioUrl,
            brollClips: sortedProductClips.map(c => ({ url: c.cloudinaryUrl, durationSeconds: c.durationSeconds, order: c.order })),
            scenes: refinedScript.scenes,
            industry,
            style,
          });
          console.log(`[Inngest][${projectId}] Step 6b ✓ renderId=${result.renderId}`);
          await Job.findByIdAndUpdate(jobId, { renderId: result.renderId });
          await Project.findByIdAndUpdate(projectId, { renderId: result.renderId });
          return result;
        });

        // Wait for Shotstack (prod: webhook + fallback; dev: direct poll)
        let productShotstackUrl: string | null = null;

        if (!dev) {
          const shotstackDoneProduct = await step.waitForEvent("shotstack-done-product", {
            event: "video/shotstack.completed",
            match: "data.projectId",
            timeout: "10m",
          });

          if (shotstackDoneProduct) {
            const ssData = shotstackDoneProduct.data as ShotstackCompletedData;
            if (ssData.error || !ssData.videoUrl) {
              await step.run("handle-shotstack-failure-product", async () => {
                await connectDB();
                await refundCredits(userId, "video_generation", projectId);
                await Project.findByIdAndUpdate(projectId, { status: "failed", error: `Shotstack composition failed. renderId: ${compositionProduct.renderId}` });
                await Job.findByIdAndUpdate(jobId, { status: "failed" });
              });
              return;
            }
            productShotstackUrl = ssData.videoUrl;
          } else {
            console.warn(`[Inngest][${projectId}] Shotstack webhook timed out for product — polling, renderId=${compositionProduct.renderId}`);
            productShotstackUrl = await shotstackFallbackPoll(step, compositionProduct.renderId);
          }
        } else {
          productShotstackUrl = await shotstackFallbackPoll(step, compositionProduct.renderId);
        }

        if (!productShotstackUrl) {
          await step.run("handle-shotstack-timeout-product", async () => {
            await connectDB();
            await refundCredits(userId, "video_generation", projectId);
            await Project.findByIdAndUpdate(projectId, { status: "failed", error: `Composition timed out. Shotstack renderId: ${compositionProduct.renderId}` });
            await Job.findByIdAndUpdate(jobId, { status: "failed" });
          });
          return;
        }

        // Upload final composed video to Cloudinary
        const finalProductUrl = await step.run("upload-final-to-cloudinary-product", async () => {
          console.log(`[Inngest][${projectId}] Step 8b: uploading final product video to Cloudinary`);
          const uploaded = await cloudinaryService.uploadVideo(productShotstackUrl!, {
            folder: `beyond-social/projects/${projectId}`,
            tags: ["final", "composed", videoType],
          });
          console.log(`[Inngest][${projectId}] Step 8b ✓ finalUrl=${uploaded.secure_url}`);
          return uploaded.secure_url;
        });

        await step.run("persist-result-product", async () => {
          await connectDB();
          console.log(`[Inngest][${projectId}] Step 9b ✓ persisting final product video`);
          await Project.findByIdAndUpdate(projectId, {
            status: "completed",
            generatedVideoUrl: finalProductUrl,
            videoUrl: finalProductUrl,
            brollClipUrls: sortedProductClips.map(c => c.cloudinaryUrl),
            generationEngine: `kling-2.5+tts+shotstack-${videoType}`,
          });
          await Job.findByIdAndUpdate(jobId, { status: "completed" });
        });
      }

    } catch (topLevelErr) {
      const raw = topLevelErr instanceof Error ? topLevelErr.message : String(topLevelErr);
      const userMsg = friendlyError(raw);
      console.error(`[Inngest][${projectId}] ✗ unhandled top-level error:`, raw);
      try {
        await connectDB();
        await Project.findByIdAndUpdate(projectId, { status: "failed", error: userMsg });
        await refundCredits(userId, "video_generation", projectId);
      } catch (cleanupErr) {
        console.error(`[Inngest][${projectId}] ✗ cleanup after failure also threw:`, cleanupErr);
      }
      throw topLevelErr;
    }
  }
);
