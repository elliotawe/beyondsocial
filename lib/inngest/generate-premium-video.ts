import { inngest } from "@/inngest";
import { planScenes } from "@/lib/scene-planner";
import { generateAvatarClip, generateBrollClip, generateAndUploadAudio, generateAudioWithClonedVoice } from "@/lib/fal-service";
import { composeVideo, composeVideoNoAvatar } from "@/lib/shotstack-service";
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

// What the fal webhook fires into Inngest
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

// Internal type after Cloudinary upload
interface ResolvedClip {
  requestId: string;
  videoUrl: string;
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

export const generatePremiumVideo = inngest.createFunction(
  {
    id: "generate-premium-video",
    concurrency: { key: "event.data.userId", limit: 2 },
    // retries intentionally 0: waitForEvent is not retry-safe (consumed events can't be replayed)
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

    try {

    await connectDB();

    console.log(`[Inngest][${projectId}] ▶ generate-premium-video started`, {
      jobId,
      userId,
      imageCount: images.length,
      videoType,
      industry,
      style,
      tone,
      voice,
      sceneCount: refinedScript?.scenes?.length,
    });

    // STEP 1: Plan scenes
    const scenePlan = await step.run("plan-scenes", async () => {
      console.log(`[Inngest][${projectId}] Step 1: planning scenes for ${images.length} images, videoType=${videoType}`);
      try {
        const plan = await planScenes({ images, refinedScript, industry, style, tone, videoType, portraitImageUrl });
        console.log(`[Inngest][${projectId}] Step 1 ✓ scenePlan`, {
          portraitImageUrl: plan.portraitImageUrl,
          brollCount: plan.brollPlan.length,
          totalDurationSeconds: plan.totalDurationSeconds,
          voiceoverLength: plan.fullVoiceoverScript?.length,
        });
        return plan;
      } catch (err) {
        console.error(`[Inngest][${projectId}] Step 1 ✗ planScenes threw:`, err);
        throw err;
      }
    });

    // STEP 2: Mark project as processing
    await step.run("set-processing", async () => {
      await connectDB();
      await Project.findByIdAndUpdate(projectId, { status: "processing", scenePlan });
      await Job.findByIdAndUpdate(jobId, { status: "processing" });
      console.log(`[Inngest][${projectId}] Step 2 ✓ project marked processing`);
    });

    // ─── BRANCH: Person-led vs Product / Property ───────────────────────────────

    if (videoType === "person") {

      // STEP 3a: Submit avatar + all b-roll jobs
      const allJobIds = await step.run("submit-all-jobs", async () => {
        await connectDB();

        // Resolve audio URL — use cloned voice (zonos) if set, else OpenAI TTS
        const useCloned = voice === "cloned" && !!clonedVoiceUrl;
        console.log(`[Inngest][${projectId}] Step 3a: resolving audio`, {
          useCloned,
          voiceoverChars: scenePlan.fullVoiceoverScript?.length,
        });
        const resolvedAudioUrl = useCloned
          ? await generateAudioWithClonedVoice(clonedVoiceUrl!, scenePlan.fullVoiceoverScript)
          : await generateAndUploadAudio(scenePlan.fullVoiceoverScript, voice ?? "nova");

        console.log(`[Inngest][${projectId}] Step 3a: submitting avatar clip`, {
          portraitUrl: scenePlan.portraitImageUrl,
          durationSeconds: scenePlan.totalDurationSeconds,
          audioSource: useCloned ? "zonos" : "openai-tts",
        });

        let avatarRequestId: string;
        try {
          const avatarResult = await generateAvatarClip({
            portraitUrl: scenePlan.portraitImageUrl,
            audioUrl: resolvedAudioUrl,
            durationSeconds: scenePlan.totalDurationSeconds,
          });
          avatarRequestId = avatarResult.requestId;
          console.log(`[Inngest][${projectId}] Step 3a ✓ avatar submitted, requestId=${avatarRequestId}`);
        } catch (err) {
          console.error(`[Inngest][${projectId}] Step 3a ✗ avatar submission failed:`, err);
          throw new Error(`Avatar job submission failed: ${err instanceof Error ? err.message : String(err)}`);
        }

        const brollRequestIds: string[] = [];
        const brollPlanItems: Array<{ requestId: string; imageUrl: string; order: number; durationSeconds: number }> = [];

        for (const scene of scenePlan.brollPlan) {
          console.log(`[Inngest][${projectId}] Step 3a: submitting b-roll order=${scene.order}`, {
            imageUrl: scene.imageUrl,
            durationSeconds: scene.durationSeconds,
            promptPreview: scene.klingPrompt?.slice(0, 80),
          });
          try {
            const brollResult = await generateBrollClip({
              imageUrl: scene.imageUrl,
              prompt: scene.klingPrompt,
              durationSeconds: scene.durationSeconds,
              aspectRatio: "9:16",
            });
            brollRequestIds.push(brollResult.requestId);
            brollPlanItems.push({
              requestId: brollResult.requestId,
              imageUrl: scene.imageUrl,
              order: scene.order,
              durationSeconds: scene.durationSeconds,
            });
            console.log(`[Inngest][${projectId}] Step 3a ✓ b-roll order=${scene.order} submitted, requestId=${brollResult.requestId}`);
          } catch (err) {
            console.error(`[Inngest][${projectId}] Step 3a ✗ b-roll order=${scene.order} failed — skipping:`, err);
          }
        }

        await Job.findByIdAndUpdate(jobId, {
          avatarRequestId,
          brollRequestIds,
          brollPlanItems,
          totalClips: 1 + brollPlanItems.length,
          completedClips: 0,
        });

        console.log(`[Inngest][${projectId}] Step 3a summary`, {
          avatarRequestId,
          brollCount: brollPlanItems.length,
          failedBroll: scenePlan.brollPlan.length - brollPlanItems.length,
        });

        return { avatarRequestId, brollPlanItems };
      });

      const totalJobs = 1 + allJobIds.brollPlanItems.length;
      console.log(`[Inngest][${projectId}] Step 4: waiting for ${totalJobs} clips`);

      let successCount = 0;
      const resolvedClips: ResolvedClip[] = [];

      for (let i = 0; i < totalJobs; i++) {
        const clipEvent = await step.waitForEvent(`clip-done-${i}`, {
          event: "video/clip.completed",
          match: "data.projectId",
          timeout: "15m",
        });

        if (!clipEvent) {
          console.error(`[Inngest][${projectId}] Step 4 ✗ clip ${i} timed out`);
          await step.run(`handle-timeout-${i}`, async () => {
            await connectDB();
            await refundCredits(userId, "video_generation", projectId);
            await Project.findByIdAndUpdate(projectId, { status: "failed", error: "Clip generation timed out after 15 minutes." });
            await Job.findByIdAndUpdate(jobId, { status: "failed" });
          });
          return;
        }

        const clipData = clipEvent.data as ClipCompletedData;
        console.log(`[Inngest][${projectId}] Step 4: received clip ${i}`, {
          type: clipData.type,
          requestId: clipData.requestId,
          error: clipData.error,
          hasRawUrl: !!clipData.rawVideoUrl,
          order: clipData.order,
        });

        if (clipData.error) {
          if (clipData.type === "avatar") {
            await step.run(`handle-avatar-failure-${i}`, async () => {
              await connectDB();
              await refundCredits(userId, "video_generation", projectId);
              await Project.findByIdAndUpdate(projectId, { status: "failed", error: "Avatar clip generation failed." });
              await Job.findByIdAndUpdate(jobId, { status: "failed" });
            });
            return;
          }
          console.warn(`[Inngest][${projectId}] B-roll clip failed for requestId ${clipData.requestId} — skipping`);
          await step.run(`update-progress-${i}`, async () => {
            await connectDB();
            await Job.findByIdAndUpdate(jobId, { $inc: { completedClips: 1 } });
          });
          continue;
        }

        // Upload clip to Cloudinary inside a step so it's retryable and doesn't block the webhook
        const cloudinaryUrl = await step.run(`cloudinary-upload-${i}`, async () => {
          console.log(`[Inngest][${projectId}] Uploading clip ${i} (${clipData.type}) to Cloudinary`);
          const uploaded = await cloudinaryService.uploadVideo(clipData.rawVideoUrl!, {
            folder: "beyond-social/clips",
            tags: [clipData.type, "ai-generated"],
          });
          console.log(`[Inngest][${projectId}] Cloudinary upload ✓ clip ${i} → ${uploaded.secure_url}`);
          return uploaded.secure_url;
        });

        successCount++;
        resolvedClips.push({
          requestId: clipData.requestId,
          videoUrl: cloudinaryUrl,
          type: clipData.type,
          order: clipData.order ?? i,
          durationSeconds: clipData.durationSeconds ?? 5,
        });

        await step.run(`update-progress-${i}`, async () => {
          await connectDB();
          await Job.findByIdAndUpdate(jobId, { completedClips: successCount });
        });
      }

      console.log(`[Inngest][${projectId}] Step 4 ✓ all clips received`, {
        total: resolvedClips.length,
        avatarCount: resolvedClips.filter(c => c.type === "avatar").length,
        brollCount: resolvedClips.filter(c => c.type === "broll").length,
      });

      const avatarClip = resolvedClips.find(c => c.type === "avatar");
      if (!avatarClip) {
        await step.run("handle-no-avatar", async () => {
          await connectDB();
          await refundCredits(userId, "video_generation", projectId);
          await Project.findByIdAndUpdate(projectId, { status: "failed", error: "No avatar clip was generated." });
          await Job.findByIdAndUpdate(jobId, { status: "failed" });
        });
        return;
      }

      const brollClipsOrdered = resolvedClips
        .filter(c => c.type === "broll")
        .sort((a, b) => a.order - b.order);

      if (brollClipsOrdered.length === 0 && scenePlan.brollPlan.length > 0) {
        await step.run("handle-no-broll", async () => {
          await connectDB();
          await refundCredits(userId, "video_generation", projectId);
          await Project.findByIdAndUpdate(projectId, { status: "failed", error: "All b-roll clips failed to generate." });
          await Job.findByIdAndUpdate(jobId, { status: "failed" });
        });
        return;
      }

      // STEP 6a: Compose with Shotstack
      const composition = await step.run("compose-video", async () => {
        await connectDB();
        console.log(`[Inngest][${projectId}] Step 6a: composing via Shotstack (with avatar)`, {
          avatarClipUrl: avatarClip.videoUrl,
          brollCount: brollClipsOrdered.length,
        });
        const result = await composeVideo({
          avatarClipUrl: avatarClip.videoUrl,
          brollClips: brollClipsOrdered.map(c => ({
            url: c.videoUrl,
            durationSeconds: c.durationSeconds,
            order: c.order,
          })),
          scenes: refinedScript.scenes,
          industry,
          style,
        });
        console.log(`[Inngest][${projectId}] Step 6a ✓ renderId=${result.renderId}`);
        await Job.findByIdAndUpdate(jobId, { renderId: result.renderId });
        await Project.findByIdAndUpdate(projectId, { renderId: result.renderId });
        return result;
      });

      const shotstackDone = await step.waitForEvent("shotstack-done", {
        event: "video/shotstack.completed",
        match: "data.projectId",
        timeout: "10m",
      });

      if (!shotstackDone) {
        console.error(`[Inngest][${projectId}] Step 7 ✗ Shotstack timed out, renderId=${composition.renderId}`);
        await step.run("handle-shotstack-timeout", async () => {
          await connectDB();
          await refundCredits(userId, "video_generation", projectId);
          await Project.findByIdAndUpdate(projectId, { status: "failed", error: `Composition timed out. Shotstack renderId: ${composition.renderId}` });
          await Job.findByIdAndUpdate(jobId, { status: "failed" });
        });
        return;
      }

      const shotstackData = shotstackDone.data as ShotstackCompletedData;
      console.log(`[Inngest][${projectId}] Step 7: Shotstack webhook received`, {
        error: shotstackData.error,
        hasVideoUrl: !!shotstackData.videoUrl,
      });

      if (shotstackData.error || !shotstackData.videoUrl) {
        await step.run("handle-shotstack-failure", async () => {
          await connectDB();
          await refundCredits(userId, "video_generation", projectId);
          await Project.findByIdAndUpdate(projectId, { status: "failed", error: `Shotstack composition failed. renderId: ${composition.renderId}` });
          await Job.findByIdAndUpdate(jobId, { status: "failed" });
        });
        return;
      }

      await step.run("persist-result", async () => {
        await connectDB();
        console.log(`[Inngest][${projectId}] Step 8 ✓ persisting final video`);
        await Project.findByIdAndUpdate(projectId, {
          status: "completed",
          generatedVideoUrl: shotstackData.videoUrl,
          videoUrl: shotstackData.videoUrl,
          avatarClipUrl: avatarClip.videoUrl,
          brollClipUrls: brollClipsOrdered.map(c => c.videoUrl),
          generationEngine: "creatify-aurora+kling-2.5+shotstack",
        });
        await Job.findByIdAndUpdate(jobId, { status: "completed" });
      });

    } else {
      // ── PRODUCT / PROPERTY: b-roll only + TTS voiceover ──────────────────────

      // STEP 3b: Generate TTS + submit b-roll jobs
      const productJobIds = await step.run("submit-broll-jobs", async () => {
        await connectDB();

        const useClonedForProduct = voice === "cloned" && !!clonedVoiceUrl;
        console.log(`[Inngest][${projectId}] Step 3b: generating audio for ${videoType} video`, {
          audioSource: useClonedForProduct ? "zonos" : "openai-tts",
        });
        let audioUrl: string;
        try {
          audioUrl = useClonedForProduct
            ? await generateAudioWithClonedVoice(clonedVoiceUrl!, scenePlan.fullVoiceoverScript)
            : await generateAndUploadAudio(scenePlan.fullVoiceoverScript, voice ?? "nova");
          console.log(`[Inngest][${projectId}] Step 3b ✓ audio resolved: ${audioUrl}`);
        } catch (err) {
          console.error(`[Inngest][${projectId}] Step 3b ✗ audio generation failed:`, err);
          throw new Error(`Audio generation failed: ${err instanceof Error ? err.message : String(err)}`);
        }

        const brollRequestIds: string[] = [];
        const brollPlanItems: Array<{ requestId: string; imageUrl: string; order: number; durationSeconds: number }> = [];

        for (const scene of scenePlan.brollPlan) {
          console.log(`[Inngest][${projectId}] Step 3b: submitting b-roll order=${scene.order}`, {
            imageUrl: scene.imageUrl,
            durationSeconds: scene.durationSeconds,
          });
          try {
            const brollResult = await generateBrollClip({
              imageUrl: scene.imageUrl,
              prompt: scene.klingPrompt,
              durationSeconds: scene.durationSeconds,
              aspectRatio: "9:16",
            });
            brollRequestIds.push(brollResult.requestId);
            brollPlanItems.push({
              requestId: brollResult.requestId,
              imageUrl: scene.imageUrl,
              order: scene.order,
              durationSeconds: scene.durationSeconds,
            });
            console.log(`[Inngest][${projectId}] Step 3b ✓ b-roll order=${scene.order} submitted, requestId=${brollResult.requestId}`);
          } catch (err) {
            console.error(`[Inngest][${projectId}] Step 3b ✗ b-roll order=${scene.order} failed — skipping:`, err);
          }
        }

        await Job.findByIdAndUpdate(jobId, {
          brollRequestIds,
          brollPlanItems,
          totalClips: brollPlanItems.length,
          completedClips: 0,
        });

        return { audioUrl, brollPlanItems };
      });

      const totalBrollJobs = productJobIds.brollPlanItems.length;
      console.log(`[Inngest][${projectId}] Step 4b: waiting for ${totalBrollJobs} b-roll clips`);

      let brollSuccessCount = 0;
      const resolvedBrollClips: ResolvedClip[] = [];

      for (let i = 0; i < totalBrollJobs; i++) {
        const clipEvent = await step.waitForEvent(`clip-done-${i}`, {
          event: "video/clip.completed",
          match: "data.projectId",
          timeout: "15m",
        });

        if (!clipEvent) {
          console.error(`[Inngest][${projectId}] Step 4b ✗ b-roll clip ${i} timed out`);
          await step.run(`handle-broll-timeout-${i}`, async () => {
            await connectDB();
            await refundCredits(userId, "video_generation", projectId);
            await Project.findByIdAndUpdate(projectId, { status: "failed", error: "B-roll clip generation timed out." });
            await Job.findByIdAndUpdate(jobId, { status: "failed" });
          });
          return;
        }

        const clipData = clipEvent.data as ClipCompletedData;
        console.log(`[Inngest][${projectId}] Step 4b: received b-roll clip ${i}`, {
          error: clipData.error,
          hasRawUrl: !!clipData.rawVideoUrl,
          order: clipData.order,
        });

        if (clipData.error) {
          console.warn(`[Inngest][${projectId}] B-roll clip ${i} failed — skipping`);
          await step.run(`update-progress-broll-${i}`, async () => {
            await connectDB();
            await Job.findByIdAndUpdate(jobId, { $inc: { completedClips: 1 } });
          });
          continue;
        }

        const cloudinaryUrl = await step.run(`cloudinary-upload-broll-${i}`, async () => {
          console.log(`[Inngest][${projectId}] Uploading b-roll clip ${i} to Cloudinary`);
          const uploaded = await cloudinaryService.uploadVideo(clipData.rawVideoUrl!, {
            folder: "beyond-social/clips",
            tags: ["broll", "ai-generated"],
          });
          console.log(`[Inngest][${projectId}] Cloudinary ✓ b-roll ${i} → ${uploaded.secure_url}`);
          return uploaded.secure_url;
        });

        brollSuccessCount++;
        resolvedBrollClips.push({
          requestId: clipData.requestId,
          videoUrl: cloudinaryUrl,
          type: "broll",
          order: clipData.order ?? i,
          durationSeconds: clipData.durationSeconds ?? 5,
        });

        await step.run(`update-progress-broll-${i}`, async () => {
          await connectDB();
          await Job.findByIdAndUpdate(jobId, { completedClips: brollSuccessCount });
        });
      }

      if (resolvedBrollClips.length === 0) {
        await step.run("handle-no-broll-product", async () => {
          await connectDB();
          await refundCredits(userId, "video_generation", projectId);
          await Project.findByIdAndUpdate(projectId, { status: "failed", error: "All b-roll clips failed to generate." });
          await Job.findByIdAndUpdate(jobId, { status: "failed" });
        });
        return;
      }

      const brollClipsOrdered = resolvedBrollClips.sort((a, b) => a.order - b.order);

      // STEP 6b: Compose without avatar
      const compositionNoAvatar = await step.run("compose-video-no-avatar", async () => {
        await connectDB();
        console.log(`[Inngest][${projectId}] Step 6b: composing via Shotstack (no avatar)`, {
          audioUrl: productJobIds.audioUrl,
          brollCount: brollClipsOrdered.length,
        });
        const result = await composeVideoNoAvatar({
          audioUrl: productJobIds.audioUrl,
          brollClips: brollClipsOrdered.map(c => ({
            url: c.videoUrl,
            durationSeconds: c.durationSeconds,
            order: c.order,
          })),
          scenes: refinedScript.scenes,
          industry,
          style,
        });
        console.log(`[Inngest][${projectId}] Step 6b ✓ renderId=${result.renderId}`);
        await Job.findByIdAndUpdate(jobId, { renderId: result.renderId });
        await Project.findByIdAndUpdate(projectId, { renderId: result.renderId });
        return result;
      });

      const shotstackDoneProduct = await step.waitForEvent("shotstack-done", {
        event: "video/shotstack.completed",
        match: "data.projectId",
        timeout: "10m",
      });

      if (!shotstackDoneProduct) {
        console.error(`[Inngest][${projectId}] Step 7b ✗ Shotstack timed out, renderId=${compositionNoAvatar.renderId}`);
        await step.run("handle-shotstack-timeout-product", async () => {
          await connectDB();
          await refundCredits(userId, "video_generation", projectId);
          await Project.findByIdAndUpdate(projectId, { status: "failed", error: `Composition timed out. Shotstack renderId: ${compositionNoAvatar.renderId}` });
          await Job.findByIdAndUpdate(jobId, { status: "failed" });
        });
        return;
      }

      const shotstackDataProduct = shotstackDoneProduct.data as ShotstackCompletedData;
      console.log(`[Inngest][${projectId}] Step 7b: Shotstack webhook received`, {
        error: shotstackDataProduct.error,
        hasVideoUrl: !!shotstackDataProduct.videoUrl,
      });

      if (shotstackDataProduct.error || !shotstackDataProduct.videoUrl) {
        await step.run("handle-shotstack-failure-product", async () => {
          await connectDB();
          await refundCredits(userId, "video_generation", projectId);
          await Project.findByIdAndUpdate(projectId, { status: "failed", error: `Shotstack composition failed. renderId: ${compositionNoAvatar.renderId}` });
          await Job.findByIdAndUpdate(jobId, { status: "failed" });
        });
        return;
      }

      await step.run("persist-result-product", async () => {
        await connectDB();
        console.log(`[Inngest][${projectId}] Step 8b ✓ persisting final product video`);
        await Project.findByIdAndUpdate(projectId, {
          status: "completed",
          generatedVideoUrl: shotstackDataProduct.videoUrl,
          videoUrl: shotstackDataProduct.videoUrl,
          brollClipUrls: brollClipsOrdered.map(c => c.videoUrl),
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
