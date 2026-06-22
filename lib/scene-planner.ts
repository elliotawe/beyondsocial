import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { RefinedScript } from "./ai-service";
import { detectBestPortrait } from "./fal-service";

export interface BrollPlanItem {
  imageUrl: string;
  sceneRole: string;
  klingPrompt: string;
  durationSeconds: number;
  order: number;
}

export interface ScenePlan {
  portraitImageUrl: string;
  brollPlan: BrollPlanItem[];
  fullVoiceoverScript: string;
  totalDurationSeconds: number;
}

export async function planScenes(params: {
  images: string[];
  refinedScript: RefinedScript;
  industry: string;
  style: string;
  tone: string;
  videoType?: "person" | "product" | "property";
  portraitImageUrl?: string;
}): Promise<ScenePlan> {
  const { images, refinedScript, industry, style, tone, videoType = "person", portraitImageUrl } = params;

  const totalDuration = refinedScript.scenes.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 3),
    0
  );

  const fullVoiceoverScript = refinedScript.scenes
    .map((s) => s.script)
    .filter(Boolean)
    .join(" ");

  let resolvedPortraitUrl = "";
  if (videoType === "person") {
    resolvedPortraitUrl = portraitImageUrl || await detectBestPortrait(images);
  }

  // No b-roll images — return empty plan (avatar-only or TTS-only video)
  if (images.length === 0) {
    return {
      portraitImageUrl: resolvedPortraitUrl,
      brollPlan: [],
      fullVoiceoverScript,
      totalDurationSeconds: totalDuration,
    };
  }

  // Ask GPT-4o-mini to assign each image a scene role and write a Kling prompt
  const sceneDescriptions = refinedScript.scenes
    .map(
      (s, i) =>
        `Scene ${i + 1} [${s.role}] (${s.duration_seconds}s): "${s.script}" — Visual: "${s.visual_direction}"`
    )
    .join("\n");

  const imageList = images
    .map((url, i) => `Image ${i + 1}: ${url}`)
    .join("\n");

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system:
      "You are a video director assigning reference photos to scenes and writing cinematic Kling 2.5 Turbo Pro video prompts. Each prompt must follow this format: '[Camera movement]. [Subject description]. [Lighting]. [Mood]. Photorealistic. No text overlays. 9:16 vertical frame.' Keep prompts under 120 words.",
    prompt: `
You have ${images.length} photos and ${refinedScript.scenes.length} scenes. Assign each photo to a scene (or reuse if needed), and write a Kling prompt for each assignment.

Industry: ${industry}
Style: ${style}
Tone: ${tone}

Scenes:
${sceneDescriptions}

Photos (index = position in array, 0-based):
${imageList}

Rules:
- If photos < scenes: reuse photos, prioritising variety across the b-roll.
- If photos > scenes: assign multiple photos to body/value scenes.
- Each assignment gets its own entry.
- durationSeconds must match the scene it maps to.

Return ONLY a JSON array:
[
  {
    "imageIndex": 0,
    "sceneRole": "hook",
    "klingPrompt": "...",
    "durationSeconds": 3,
    "order": 0
  }
]
`,
  });

  let assignments: {
    imageIndex: number;
    sceneRole: string;
    klingPrompt: string;
    durationSeconds: number;
    order: number;
  }[] = [];

  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    assignments = JSON.parse(cleaned);
  } catch {
    // Fallback: assign images to scenes in order, cycling if needed
    assignments = refinedScript.scenes.map((scene, i) => ({
      imageIndex: i % images.length,
      sceneRole: scene.role,
      klingPrompt: `${style} shot. ${scene.visual_direction}. ${tone} mood. Photorealistic. No text overlays. 9:16 vertical frame.`,
      durationSeconds: scene.duration_seconds ?? 3,
      order: i,
    }));
  }

  const MAX_BROLL_CLIPS = 3;

  let brollPlan: BrollPlanItem[] = assignments.map((a, idx) => ({
    imageUrl: images[a.imageIndex] ?? images[0],
    sceneRole: a.sceneRole,
    klingPrompt: a.klingPrompt,
    durationSeconds: a.durationSeconds,
    order: a.order ?? idx,
  }));

  // Cap clips to MAX_BROLL_CLIPS — merge excess clip durations into the last kept clip
  if (brollPlan.length > MAX_BROLL_CLIPS) {
    const kept = brollPlan.slice(0, MAX_BROLL_CLIPS);
    const overflow = brollPlan.slice(MAX_BROLL_CLIPS);
    const extraSeconds = overflow.reduce((sum, c) => sum + c.durationSeconds, 0);
    kept[kept.length - 1] = {
      ...kept[kept.length - 1],
      durationSeconds: kept[kept.length - 1].durationSeconds + extraSeconds,
    };
    brollPlan = kept;
  }

  return {
    portraitImageUrl: resolvedPortraitUrl,
    brollPlan,
    fullVoiceoverScript,
    totalDurationSeconds: totalDuration,
  };
}
