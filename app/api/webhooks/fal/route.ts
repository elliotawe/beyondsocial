import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import connectDB from "@/lib/db";
import { Job } from "@/models/Job";

interface FalWebhookPayload {
  request_id: string;
  // fal sends "OK" for success, "ERROR" for failure
  status: string;
  // fal wraps model output in "payload"; some older responses use "output"
  payload?: { video?: { url?: string }; video_url?: string };
  output?: { video?: { url?: string }; video_url?: string };
  error?: string | null;
}

export async function POST(req: NextRequest) {
  // Shared-secret guard — prevents spoofed webhook events
  const secret = req.nextUrl.searchParams.get("secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as FalWebhookPayload;
    const { request_id, status, payload, output, error } = body;
    const resultData = payload ?? output;

    console.log(`[Webhook/fal] Received`, {
      request_id,
      status,
      error,
      hasPayload: !!payload,
      hasOutput: !!output,
    });

    if (!request_id) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    const isSuccess = status === "OK" || status === "COMPLETED";
    const isFailure = status === "ERROR" || status === "FAILED";

    if (!isSuccess && !isFailure) {
      // IN_QUEUE / IN_PROGRESS — acknowledge and ignore
      return NextResponse.json({ received: true });
    }

    await connectDB();

    const job = await Job.findOne({
      $or: [
        { avatarRequestId: request_id },
        { brollRequestIds: request_id },
      ],
    }).lean() as {
      _id: unknown;
      projectId: string;
      avatarRequestId?: string;
      brollRequestIds?: string[];
      brollPlanItems?: Array<{ requestId: string; imageUrl: string; order: number; durationSeconds: number }>;
    } | null;

    if (!job) {
      console.warn(`[Webhook/fal] Unknown request_id: ${request_id} — no matching Job`);
      return NextResponse.json({ received: true });
    }

    const projectId = String(job.projectId);
    const isAvatar = job.avatarRequestId === request_id;
    const type: "avatar" | "broll" = isAvatar ? "avatar" : "broll";

    // Resolve ordering metadata from brollPlanItems (set at submission time)
    let order: number | undefined;
    let durationSeconds: number | undefined;

    if (!isAvatar) {
      const planItem = job.brollPlanItems?.find(p => p.requestId === request_id);
      if (planItem) {
        order = planItem.order;
        durationSeconds = planItem.durationSeconds;
      } else {
        // Fallback for Jobs created before brollPlanItems was added
        const idx = job.brollRequestIds?.indexOf(request_id) ?? -1;
        order = idx >= 0 ? idx : undefined;
      }
    }

    console.log(`[Webhook/fal] Matched job → projectId=${projectId}, type=${type}, order=${order}`);

    if (isSuccess) {
      const rawVideoUrl = resultData?.video?.url ?? resultData?.video_url ?? "";

      console.log(`[Webhook/fal] SUCCESS (status=${status}): request_id=${request_id}`, {
        rawVideoUrl,
        payloadKeys: resultData ? Object.keys(resultData) : [],
      });

      if (!rawVideoUrl) {
        console.error(`[Webhook/fal] No video URL in payload for ${request_id}:`, JSON.stringify(resultData));
        await inngest.send({
          name: "video/clip.completed",
          data: { projectId, requestId: request_id, error: true, type, order, durationSeconds },
        });
        return NextResponse.json({ received: true });
      }

      // Fire event immediately with the raw URL — Cloudinary upload happens inside Inngest (retryable)
      await inngest.send({
        name: "video/clip.completed",
        data: {
          projectId,
          requestId: request_id,
          rawVideoUrl,
          type,
          order,
          durationSeconds,
          error: false,
        },
      });

    } else {
      console.error(`[Webhook/fal] Job failed: ${request_id} — ${error}`);
      await inngest.send({
        name: "video/clip.completed",
        data: { projectId, requestId: request_id, error: true, type, order, durationSeconds },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook/fal] Unhandled error:", err);
    return NextResponse.json({ received: true });
  }
}
