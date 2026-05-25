import type { RefinedScript } from "./ai-service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrollClip {
  url: string;
  durationSeconds: number;
  order: number;
}

export interface ComposeVideoParams {
  avatarClipUrl: string;
  brollClips: BrollClip[];
  scenes: RefinedScript["scenes"];
  industry: string;
  style: string;
}

export interface ComposeVideoNoAvatarParams {
  audioUrl: string;
  brollClips: BrollClip[];
  scenes: RefinedScript["scenes"];
  industry: string;
  style: string;
}

// ─── Caption style presets ───────────────────────────────────────────────────

interface CaptionStyle {
  font: string;
  size: number;
  color: string;
  stroke: string;
  strokeWidth: number;
  position: string;
}

function getCaptionStyle(industry: string): CaptionStyle {
  const ind = industry?.toLowerCase() ?? "";
  if (ind.includes("real estate") || ind.includes("property")) {
    return { font: "Montserrat Bold", size: 42, color: "#FFFFFF", stroke: "#000000", strokeWidth: 3, position: "bottom" };
  }
  if (ind.includes("ecommerce") || ind.includes("e-commerce") || ind.includes("shop")) {
    return { font: "Inter ExtraBold", size: 44, color: "#FFFF00", stroke: "#000000", strokeWidth: 4, position: "bottom" };
  }
  if (ind.includes("fitness") || ind.includes("gym") || ind.includes("health")) {
    return { font: "Anton", size: 48, color: "#FFFFFF", stroke: "#FF4500", strokeWidth: 3, position: "center" };
  }
  if (ind.includes("saas") || ind.includes("software") || ind.includes("tech")) {
    return { font: "Inter SemiBold", size: 38, color: "#FFFFFF", stroke: "#1a1a1a", strokeWidth: 2, position: "bottom" };
  }
  return { font: "Inter Bold", size: 40, color: "#FFFFFF", stroke: "#000000", strokeWidth: 3, position: "bottom" };
}

// ─── Music track selection ────────────────────────────────────────────────────

function getMusicTrack(industry: string): string {
  const ind = industry?.toLowerCase() ?? "";
  if (ind.includes("real estate") || ind.includes("property")) {
    return "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3";
  }
  if (ind.includes("ecommerce") || ind.includes("e-commerce") || ind.includes("shop")) {
    return "https://assets.mixkit.co/music/preview/mixkit-hype-hands-571.mp3";
  }
  if (ind.includes("fitness") || ind.includes("gym") || ind.includes("health")) {
    return "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3";
  }
  if (ind.includes("saas") || ind.includes("software") || ind.includes("tech")) {
    return "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3";
  }
  return "https://assets.mixkit.co/music/preview/mixkit-upbeat-funky-travel-walk-185.mp3";
}

// ─── Build Shotstack timeline ─────────────────────────────────────────────────

function buildTimeline(params: ComposeVideoParams) {
  const captionStyle = getCaptionStyle(params.industry);
  const musicUrl = getMusicTrack(params.industry);

  // Total duration = sum of all scene durations
  const totalDuration = params.scenes.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 3),
    0
  );

  // Build caption clips from scene scripts
  let timeOffset = 0;
  const captionClips = params.scenes.map((scene) => {
    const clip = {
      asset: {
        type: "html",
        html: `<p style="font-family: '${captionStyle.font}', Inter, sans-serif; font-size: ${captionStyle.size}px; color: ${captionStyle.color}; -webkit-text-stroke: ${captionStyle.strokeWidth}px ${captionStyle.stroke}; text-align: center; padding: 0 24px; word-break: break-word;">${scene.script ?? ""}</p>`,
        width: 1080,
        height: 300,
      },
      start: timeOffset,
      length: scene.duration_seconds ?? 3,
      position: captionStyle.position === "center" ? "center" : "bottom",
      offset: { y: captionStyle.position === "center" ? 0 : -0.05 },
    };
    timeOffset += scene.duration_seconds ?? 3;
    return clip;
  });

  // Avatar clip (first + last scenes = hook + CTA)
  const hookDuration = params.scenes[0]?.duration_seconds ?? 3;
  const ctaDuration = params.scenes[params.scenes.length - 1]?.duration_seconds ?? 3;
  const avatarDuration = hookDuration + ctaDuration;

  const avatarClip = {
    asset: { type: "video", src: params.avatarClipUrl },
    start: 0,
    length: avatarDuration,
    fit: "cover",
    position: "center",
  };

  // B-roll clips fill the middle
  let brollOffset = hookDuration;
  const brollVideoClips = [...params.brollClips]
    .sort((a, b) => a.order - b.order)
    .map((clip) => {
      const c = {
        asset: { type: "video", src: clip.url },
        start: brollOffset,
        length: clip.durationSeconds,
        fit: "cover",
        position: "center",
      };
      brollOffset += clip.durationSeconds;
      return c;
    });

  // Shotstack `soundtrack` takes { src, volume, effect } directly — no asset wrapper
  const soundtrack = { src: musicUrl, volume: 0.15, effect: "fadeInFadeOut" };

  // Only include the b-roll track when there are actual clips — empty tracks are invalid
  const videoTracks: { clips: unknown[] }[] = [
    { clips: captionClips },
    { clips: [avatarClip] },
    ...(brollVideoClips.length > 0 ? [{ clips: brollVideoClips }] : []),
  ];

  return {
    timeline: {
      soundtrack,
      background: "#000000",
      tracks: videoTracks,
    },
    output: {
      format: "mp4",
      resolution: "hd",
      aspectRatio: "9:16",
      size: { width: 1080, height: 1920 },
    },
  };
}

// ─── API helpers ─────────────────────────────────────────────────────────────

function shotstackHeaders() {
  const env = process.env.SHOTSTACK_ENV ?? "production";
  const baseUrl =
    env === "stage"
      ? "https://api.shotstack.io/stage"
      : "https://api.shotstack.io/v1";
  return {
    baseUrl,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SHOTSTACK_API_KEY ?? "",
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function composeVideo(
  params: ComposeVideoParams
): Promise<{ renderId: string }> {
  const body = buildTimeline(params);
  const { baseUrl, headers } = shotstackHeaders();

  const shotstackBaseUrl = process.env.NEXTAUTH_URL;
  if (!shotstackBaseUrl) throw new Error("NEXTAUTH_URL is not set — cannot register Shotstack webhook callback");
  const webhookSecret = process.env.WEBHOOK_SECRET ? `?secret=${process.env.WEBHOOK_SECRET}` : "";
  const webhookUrl = `${shotstackBaseUrl}/api/webhooks/shotstack${webhookSecret}`;

  const payload = { ...body, callback: webhookUrl };

  const res = await fetch(`${baseUrl}/render`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shotstack render submission failed: ${errText}`);
  }

  const data = await res.json();
  const renderId = data?.response?.id as string;
  if (!renderId) throw new Error("Shotstack did not return a render ID");

  return { renderId };
}

export async function composeVideoNoAvatar(
  params: ComposeVideoNoAvatarParams
): Promise<{ renderId: string }> {
  const captionStyle = getCaptionStyle(params.industry);
  const musicUrl = getMusicTrack(params.industry);

  const totalDuration = params.scenes.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 3),
    0
  );

  let timeOffset = 0;
  const captionClips = params.scenes.map((scene) => {
    const clip = {
      asset: {
        type: "html",
        html: `<p style="font-family: '${captionStyle.font}', Inter, sans-serif; font-size: ${captionStyle.size}px; color: ${captionStyle.color}; -webkit-text-stroke: ${captionStyle.strokeWidth}px ${captionStyle.stroke}; text-align: center; padding: 0 24px; word-break: break-word;">${scene.script ?? ""}</p>`,
        width: 1080,
        height: 300,
      },
      start: timeOffset,
      length: scene.duration_seconds ?? 3,
      position: captionStyle.position === "center" ? "center" : "bottom",
      offset: { y: captionStyle.position === "center" ? 0 : -0.05 },
    };
    timeOffset += scene.duration_seconds ?? 3;
    return clip;
  });

  let brollOffset = 0;
  const brollVideoClips = [...params.brollClips]
    .sort((a, b) => a.order - b.order)
    .map((clip) => {
      const c = {
        asset: { type: "video", src: clip.url },
        start: brollOffset,
        length: clip.durationSeconds,
        fit: "cover",
        position: "center",
      };
      brollOffset += clip.durationSeconds;
      return c;
    });

  // Voiceover as the primary soundtrack (Shotstack format: { src, volume })
  const soundtrack = { src: params.audioUrl, volume: 1.0 };

  // Background music as an audio clip on its own track (secondary audio)
  const musicClip = {
    asset: { type: "audio", src: musicUrl, volume: 0.1, effect: "fadeInFadeOut" },
    start: 0,
    length: totalDuration,
  };

  const tracks: { clips: unknown[] }[] = [
    { clips: captionClips },
    ...(brollVideoClips.length > 0 ? [{ clips: brollVideoClips }] : []),
    { clips: [musicClip] },
  ];

  const body = {
    timeline: {
      background: "#000000",
      soundtrack,
      tracks,
    },
    output: {
      format: "mp4",
      resolution: "hd",
      aspectRatio: "9:16",
      size: { width: 1080, height: 1920 },
    },
  };

  const { baseUrl, headers } = shotstackHeaders();
  const noAvatarBaseUrl = process.env.NEXTAUTH_URL;
  if (!noAvatarBaseUrl) throw new Error("NEXTAUTH_URL is not set — cannot register Shotstack webhook callback");
  const webhookSecret = process.env.WEBHOOK_SECRET ? `?secret=${process.env.WEBHOOK_SECRET}` : "";
  const webhookUrl = `${noAvatarBaseUrl}/api/webhooks/shotstack${webhookSecret}`;

  const payload = { ...body, callback: webhookUrl };

  console.log(`[Shotstack] composeVideoNoAvatar: submitting render`, {
    brollCount: params.brollClips.length,
    totalDuration,
    webhookUrl,
  });

  const res = await fetch(`${baseUrl}/render`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shotstack no-avatar render submission failed: ${errText}`);
  }

  const data = await res.json();
  const renderId = data?.response?.id as string;
  if (!renderId) throw new Error("Shotstack did not return a render ID");

  console.log(`[Shotstack] composeVideoNoAvatar ✓ renderId=${renderId}`);
  return { renderId };
}

export async function getShotstackStatus(renderId: string): Promise<{
  status: "queued" | "fetching" | "rendering" | "saving" | "done" | "failed";
  url?: string;
  error?: string;
}> {
  const { baseUrl, headers } = shotstackHeaders();

  const res = await fetch(`${baseUrl}/render/${renderId}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch Shotstack render status");

  const data = await res.json();
  const response = data?.response ?? {};

  return {
    status: response.status,
    url: response.url,
    error: response.error,
  };
}
