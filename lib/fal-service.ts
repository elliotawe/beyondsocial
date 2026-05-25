import { fal } from "@fal-ai/client";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import OpenAI from "openai";

// Support both FAL_API_KEY and FAL_KEY (fal.ai's own convention)
fal.config({ credentials: process.env.FAL_API_KEY ?? process.env.FAL_KEY ?? "" });

// ─── Types ────────────────────────────────────────────────────────────────────

export type FalJobStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface FalStatusResult {
  status: FalJobStatus;
  videoUrl?: string;
  error?: string;
}

// ─── Portrait detection ───────────────────────────────────────────────────────

export async function detectBestPortrait(imageUrls: string[]): Promise<string> {
  if (imageUrls.length === 0) throw new Error("No images provided");
  if (imageUrls.length === 1) return imageUrls[0];

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are given ${imageUrls.length} images. Score each one from 0-10 for how suitable it is as a portrait photo for an AI talking-head avatar generator. A good portrait has: a clear human face, front-facing or slight angle, good lighting, uncluttered background. Return ONLY a JSON array of numbers in the same order as the images, e.g. [7, 2, 9]. No explanation.`,
            },
            ...imageUrls.map((url) => ({
              type: "image" as const,
              image: url,
            })),
          ],
        },
      ],
    });

    const cleaned = text.replace(/```json|```/g, "").trim();
    const scores: number[] = JSON.parse(cleaned);
    const bestIndex = scores.indexOf(Math.max(...scores));
    return imageUrls[bestIndex] ?? imageUrls[0];
  } catch {
    return imageUrls[0];
  }
}

// ─── TTS → fal storage ───────────────────────────────────────────────────────
// Aurora is a lip-sync model: it needs a real audio file, not raw text.
// We use OpenAI TTS to generate speech, then upload it to fal.ai storage.

const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type OpenAIVoice = (typeof OPENAI_VOICES)[number];

function resolveVoice(voice: string): OpenAIVoice {
  if (OPENAI_VOICES.includes(voice as OpenAIVoice)) return voice as OpenAIVoice;
  return "nova"; // default — clear, neutral, works well for marketing content
}

export async function generateAndUploadAudio(script: string, voice: string): Promise<string> {
  console.log(`[fal-service] TTS: generating audio, voice=${voice}, scriptLength=${script.length}`);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const ttsResponse = await client.audio.speech.create({
    model: "tts-1",
    voice: resolveVoice(voice),
    input: script,
    response_format: "mp3",
  });

  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
  const audioFile = new File([audioBlob], "voiceover.mp3", { type: "audio/mpeg" });

  // fal.storage.upload returns the CDN URL of the uploaded file
  const uploadedUrl = await fal.storage.upload(audioFile);
  console.log(`[fal-service] TTS: audio uploaded to fal storage → ${uploadedUrl}`);
  return uploadedUrl;
}

// ─── Voice cloning — fal-ai/zonos ────────────────────────────────────────────
// Zonos schema: { reference_audio_url (required), prompt (required) }
// Returns: { audio: { url } }
// Uses fal.subscribe (synchronous polling) — no webhook needed.

export async function generateAudioWithClonedVoice(
  referenceAudioUrl: string,
  script: string
): Promise<string> {
  console.log(`[fal-service] generateAudioWithClonedVoice: submitting to zonos`, {
    referenceAudioUrl,
    scriptLength: script?.length,
  });
  const result = await fal.subscribe("fal-ai/zonos", {
    input: {
      reference_audio_url: referenceAudioUrl,
      prompt: script,
    },
  });
  const audioUrl = (result.data as { audio?: { url?: string } })?.audio?.url;
  if (!audioUrl) throw new Error("fal-ai/zonos did not return an audio URL");
  console.log(`[fal-service] generateAudioWithClonedVoice ✓ audioUrl=${audioUrl}`);
  return audioUrl;
}

// ─── Creatify Aurora — talking head ──────────────────────────────────────────
// Aurora schema: { image_url (required), audio_url (required), prompt?, resolution?: "480p"|"720p" }
// It does NOT accept: script, voice_id, duration, aspect_ratio
// audioUrl must be pre-resolved (OpenAI TTS or cloned voice) before calling this.

export async function generateAvatarClip(params: {
  portraitUrl: string;
  audioUrl: string;
  durationSeconds: number;
}): Promise<{ requestId: string }> {
  const model = process.env.CREATIFY_AURORA_MODEL ?? "fal-ai/creatify/aurora";
  console.log(`[fal-service] generateAvatarClip: model=${model}`, {
    portraitUrl: params.portraitUrl,
    durationSeconds: params.durationSeconds,
  });

  const audioUrl = params.audioUrl;

  const falBaseUrl = process.env.NEXTAUTH_URL;
  if (!falBaseUrl) throw new Error("NEXTAUTH_URL is not set — cannot register fal.ai webhook callback");
  const webhookSecret = process.env.WEBHOOK_SECRET ? `?secret=${process.env.WEBHOOK_SECRET}` : "";
  const webhookUrl = `${falBaseUrl}/api/webhooks/fal${webhookSecret}`;
  console.log(`[fal-service] generateAvatarClip: submitting to fal queue`, {
    model,
    webhookUrl,
    portraitUrl: params.portraitUrl,
    audioUrl,
  });

  try {
    const result = await fal.queue.submit(model, {
      input: {
        image_url: params.portraitUrl,
        audio_url: audioUrl,
        resolution: "720p",
      },
      webhookUrl,
    });
    console.log(`[fal-service] generateAvatarClip ✓ requestId=${result.request_id}`);
    return { requestId: result.request_id };
  } catch (err) {
    console.error(`[fal-service] generateAvatarClip ✗ fal.queue.submit threw:`, err);
    throw err;
  }
}

// ─── Kling 2.5 Turbo Pro — b-roll per image ──────────────────────────────────
// Kling schema: { prompt (required), image_url (required), duration?: "5"|"10", negative_prompt?, cfg_scale? }
// It does NOT accept: aspect_ratio (output is always 9:16 for this model variant)
// duration only accepts "5" or "10" — clamp scene durations accordingly

export async function generateBrollClip(params: {
  imageUrl: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: "9:16";
}): Promise<{ requestId: string }> {
  const model =
    process.env.KLING_MODEL ??
    "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";

  // Only "5" or "10" are valid; anything above 7s rounds up to 10
  const duration: "5" | "10" = params.durationSeconds > 7 ? "10" : "5";
  const brollBaseUrl = process.env.NEXTAUTH_URL;
  if (!brollBaseUrl) throw new Error("NEXTAUTH_URL is not set — cannot register fal.ai webhook callback");
  const webhookSecret = process.env.WEBHOOK_SECRET ? `?secret=${process.env.WEBHOOK_SECRET}` : "";
  const webhookUrl = `${brollBaseUrl}/api/webhooks/fal${webhookSecret}`;

  console.log(`[fal-service] generateBrollClip: submitting`, {
    model,
    imageUrl: params.imageUrl,
    duration,
    webhookUrl,
    promptPreview: params.prompt?.slice(0, 80),
  });

  try {
    const result = await fal.queue.submit(model, {
      input: {
        image_url: params.imageUrl,
        prompt: params.prompt,
        duration,
      },
      webhookUrl,
    });
    console.log(`[fal-service] generateBrollClip ✓ requestId=${result.request_id}`);
    return { requestId: result.request_id };
  } catch (err) {
    console.error(`[fal-service] generateBrollClip ✗ fal.queue.submit threw:`, err);
    throw err;
  }
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function getFalJobStatus(
  endpointId: string,
  requestId: string
): Promise<FalStatusResult> {
  try {
    const statusResult = await fal.queue.status(endpointId, {
      requestId,
      logs: false,
    });

    if (statusResult.status === "COMPLETED") {
      const result = await fal.queue.result(endpointId, { requestId });
      const output = result.data as {
        video?: { url?: string };
        video_url?: string;
      };
      const videoUrl = output?.video?.url ?? output?.video_url;
      return { status: "COMPLETED", videoUrl };
    }

    if ((statusResult.status as string) === "FAILED") {
      return { status: "FAILED", error: "fal.ai job failed" };
    }

    return { status: statusResult.status as FalJobStatus };
  } catch (err) {
    return {
      status: "FAILED",
      error: err instanceof Error ? err.message : "Unknown fal.ai error",
    };
  }
}
