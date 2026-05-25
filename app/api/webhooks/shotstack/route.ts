import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import connectDB from "@/lib/db";
import { Job } from "@/models/Job";

interface ShotstackWebhookPayload {
  id: string;           // renderId
  status: "queued" | "fetching" | "rendering" | "saving" | "done" | "failed";
  url?: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ShotstackWebhookPayload;
    const { id: renderId, status, url, error } = body;

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
      return NextResponse.json({ received: true });
    }

    const projectId = String(job.projectId);

    if (status === "done" && url) {
      await inngest.send({
        name: "video/shotstack.completed",
        data: { projectId, videoUrl: url, error: false },
      });
    } else {
      console.error(`[Webhook/shotstack] Render failed: ${renderId} — ${error}`);
      await inngest.send({
        name: "video/shotstack.completed",
        data: { projectId, error: true },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook/shotstack] Unhandled error:", err);
    return NextResponse.json({ received: true });
  }
}
