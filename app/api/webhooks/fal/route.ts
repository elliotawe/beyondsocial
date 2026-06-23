import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import connectDB from "@/lib/db";
import { Job } from "@/models/Job";

interface FalWebhookPayload {
  request_id: string;
  // fal webhook status values: "OK" (success) or "ERROR" (failure).
  // "COMPLETED"/"FAILED" are queue-polling statuses only — never sent in a webhook.
  status: string;
  // fal wraps model output under "payload" in webhook POSTs.
  // The SDK's fal.queue.result() returns output under "data" — a different shape.
  payload?: { video?: { url?: string } };
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
    const { request_id, status, payload, error } = body;

    console.log(`[Webhook/fal] Received`, {
      request_id,
      status,
      error,
      hasPayload: !!payload,
    });

    if (!request_id) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    // FIX 2: webhook-path statuses are "OK" (success) or "ERROR" (failure) only.
    // "COMPLETED"/"FAILED" are queue-polling values — never sent in a webhook.
    const isSuccess = status === "OK" || status === "COMPLETED"; // COMPLETED kept as safe fallback
    const isFailure = status === "ERROR"; // removed "FAILED" — not a valid webhook status

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

    // FIX 1 (part A): return 503 — not 200 — when no job is found for this request_id.
    // fal treats any 2xx as "successfully delivered" and stops retries. A 503 triggers
    // fal's documented 10-retry/2-hour window, which recovers the race where the webhook
    // arrives before the requestId is committed to MongoDB by a fast model.
    if (!job) {
      console.warn(`[Webhook/fal] Unknown request_id: ${request_id} — returning 503 for retry`);
      return new Response(
        JSON.stringify({ error: "job not found, retry later" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
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
      // FIX 3: read URL from body.payload.video.url only — the documented webhook shape.
      // (The SDK fal.queue.result() returns output under result.data, handled separately
      //  in pollFalJobOnce/getFalJobStatus — these two shapes must not share one extractor.)
      const rawVideoUrl = payload?.video?.url ?? "";

      console.log(`[Webhook/fal] SUCCESS (status=${status}): request_id=${request_id}`, {
        rawVideoUrl,
        payloadKeys: payload ? Object.keys(payload) : [],
      });

      if (!rawVideoUrl) {
        console.error(`[Webhook/fal] No video URL in payload for ${request_id}:`, JSON.stringify(payload));
        // FIX 1 (part B — idempotency): set a deterministic Inngest event id keyed on request_id.
        // Inngest dedupes events with the same id (24h window), so fal's documented repeat
        // deliveries are handled gracefully without any schema change.
        await inngest.send({
          id: `clip-${request_id}`,
          name: "video/clip.completed",
          data: { projectId, requestId: request_id, error: true, type, order, durationSeconds },
        });
        return NextResponse.json({ received: true });
      }

      await inngest.send({
        id: `clip-${request_id}`,  // FIX 1: idempotent — safe for fal repeat deliveries
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
        id: `clip-${request_id}`,  // FIX 1: idempotent
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
