import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import connectDB from "@/lib/db";
import { Job } from "@/models/Job";

interface ShotstackWebhookPayload {
  // FIX 5: Shotstack sends multiple callback types (edit/render AND serve/copy).
  // Guard on type+action before processing — serve callbacks have a different shape.
  type?: string;    // "edit" for render callbacks, "serve" for destination callbacks
  action?: string;  // "render" for render callbacks, "copy" for serve callbacks
  id: string;       // renderId — globally unique per render
  owner?: string;
  status: "queued" | "fetching" | "rendering" | "saving" | "done" | "failed";
  url?: string;
  error?: string;
  completed?: string;
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ShotstackWebhookPayload;
    const { type, action, id: renderId, status, url, error } = body;

    // FIX 5: ignore serve/destination callbacks — only process render completions.
    // Serve callbacks have type="serve"/action="copy" and a different shape; blindly
    // parsing them as render results would fire a bad Inngest event.
    if (type !== undefined && action !== undefined) {
      if (type !== "edit" || action !== "render") {
        console.log(`[Webhook/shotstack] Ignoring non-render callback type=${type} action=${action}`);
        return NextResponse.json({ received: true });
      }
    }

    console.log(`[Webhook/shotstack] Received`, { renderId, status, url, error });

    if (!renderId) {
      return NextResponse.json({ error: "Missing render id" }, { status: 400 });
    }

    if (status !== "done" && status !== "failed") {
      // Intermediate status — acknowledge and ignore
      console.log(`[Webhook/shotstack] Intermediate status ${status} for renderId=${renderId} — ignoring`);
      return NextResponse.json({ received: true });
    }

    await connectDB();

    const job = await Job.findOne({ renderId }).lean() as {
      projectId: string;
    } | null;

    if (!job) {
      console.warn(`[Webhook/shotstack] Unknown renderId: ${renderId}`);
      // Return 503 so Shotstack retries (exponential backoff, up to 10 attempts).
      // Handles the race where the webhook arrives before renderId is written to DB.
      return new Response(
        JSON.stringify({ error: "job not found, retry later" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const projectId = String(job.projectId);

    if (status === "done" && url) {
      await inngest.send({
        // FIX 4 (idempotency): deterministic id prevents duplicate Inngest events
        // on Shotstack's documented exponential-backoff redeliveries.
        id: `shotstack-${renderId}`,
        name: "video/shotstack.completed",
        data: {
          projectId,
          renderId,   // FIX 4: include renderId so the Inngest wait can match precisely
          videoUrl: url,
          error: false,
        },
      });
    } else {
      console.error(`[Webhook/shotstack] Render failed: ${renderId} — ${error}`);
      await inngest.send({
        id: `shotstack-${renderId}`,
        name: "video/shotstack.completed",
        data: { projectId, renderId, error: true },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook/shotstack] Unhandled error:", err);
    return NextResponse.json({ received: true });
  }
}
