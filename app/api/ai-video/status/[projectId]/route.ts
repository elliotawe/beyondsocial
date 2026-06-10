import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { Job } from "@/models/Job";
import { User } from "@/models/User";
import { auth } from "@/auth";

fal.config({ credentials: process.env.FAL_API_KEY ?? "" });

type ProjectStatus = "draft" | "queued" | "processing" | "completed" | "failed";
type FalStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "UNKNOWN";

export interface ClipLiveStatus {
  type: "avatar" | "broll";
  label: string;
  status: FalStatus;
  queuePosition?: number;
}

async function safeGetFalStatus(
  model: string,
  requestId: string
): Promise<{ status: FalStatus; queuePosition?: number }> {
  try {
    const res = await fal.queue.status(model, { requestId, logs: false });
    return {
      status: res.status as FalStatus,
      queuePosition: (res as unknown as Record<string, unknown>).queue_position as number | undefined,
    };
  } catch {
    return { status: "UNKNOWN" };
  }
}

async function getLiveClipStatuses(job: {
  avatarRequestId?: string;
  brollRequestIds?: string[];
}): Promise<ClipLiveStatus[]> {
  const avatarModel =
    process.env.CREATIFY_AURORA_MODEL ?? "fal-ai/creatify/aurora";
  const brollModel =
    process.env.KLING_MODEL ??
    "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";

  const tasks: Promise<ClipLiveStatus>[] = [];

  if (job.avatarRequestId) {
    tasks.push(
      safeGetFalStatus(avatarModel, job.avatarRequestId).then((s) => ({
        type: "avatar" as const,
        label: "Avatar",
        ...s,
      }))
    );
  }

  const brollIds = job.brollRequestIds ?? [];
  for (let i = 0; i < brollIds.length; i++) {
    const rid = brollIds[i];
    if (!rid || rid === "FAILED") {
      tasks.push(
        Promise.resolve({ type: "broll" as const, label: `Scene ${i + 1}`, status: "FAILED" as const })
      );
    } else {
      const sceneLabel = `Scene ${i + 1}`;
      tasks.push(
        safeGetFalStatus(brollModel, rid).then((s) => ({
          type: "broll" as const,
          label: sceneLabel,
          ...s,
        }))
      );
    }
  }

  return Promise.all(tasks);
}

function humanStage(
  projectStatus: ProjectStatus,
  clips: ClipLiveStatus[],
  totalClips: number,
  completedClips: number
): string {
  if (projectStatus === "queued") return "Getting your project ready…";
  if (projectStatus === "completed") return "Done";
  if (projectStatus === "failed") return "Failed";

  if (totalClips === 0) return "Planning your scenes…";

  // All clips accounted for by webhooks → Shotstack composing
  if (completedClips >= totalClips) return "All clips ready — composing your final video…";

  if (clips.length === 0) return "Sending clips to AI — waiting for confirmation…";

  const avatar = clips.find((c) => c.type === "avatar");
  const brolls = clips.filter((c) => c.type === "broll");

  // Avatar still rendering
  if (avatar && (avatar.status === "IN_QUEUE" || avatar.status === "IN_PROGRESS")) {
    if (avatar.status === "IN_QUEUE") {
      const pos = avatar.queuePosition;
      return pos != null && pos > 0
        ? `Your talking-head avatar is in the render queue (position ${pos})…`
        : "Your talking-head avatar is queued for rendering…";
    }
    return "Your avatar is rendering now — hang tight…";
  }

  // Avatar done, check b-roll
  const pendingBrolls = brolls.filter(
    (c) => c.status === "IN_QUEUE" || c.status === "IN_PROGRESS"
  );

  if (pendingBrolls.length > 0) {
    const doneCount = completedClips;
    const pendingNames = pendingBrolls.map((c) => c.label).join(", ");
    if (doneCount === 0) {
      return `Rendering ${pendingBrolls.length} b-roll scene${pendingBrolls.length > 1 ? "s" : ""} (${pendingNames})…`;
    }
    return `${doneCount} of ${totalClips} clips done — still rendering ${pendingNames}…`;
  }

  if (completedClips > 0) {
    return `${completedClips} of ${totalClips} clips done — composing…`;
  }

  return "Generating your video clips…";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const project = await Project.findById(projectId).lean() as {
      _id: unknown;
      userId: { toString(): string };
      status: ProjectStatus;
      generatedVideoUrl?: string;
      videoUrl?: string;
      script?: unknown;
      error?: string;
    } | null;

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const user = await User.findOne({ email: session.user.email }).lean() as {
      _id: { toString(): string };
    } | null;

    if (!user || project.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const job = await Job.findOne({ projectId }).lean() as {
      totalClips?: number;
      completedClips?: number;
      avatarRequestId?: string;
      brollRequestIds?: string[];
    } | null;

    const totalClips = job?.totalClips ?? 0;
    const completedClips = job?.completedClips ?? 0;

    // For in-flight jobs, fetch live fal.ai status for each clip
    let liveClips: ClipLiveStatus[] = [];
    if (
      project.status === "processing" &&
      job &&
      (job.avatarRequestId || (job.brollRequestIds?.length ?? 0) > 0) &&
      completedClips < totalClips
    ) {
      liveClips = await getLiveClipStatuses(job);
    }

    const currentStage = humanStage(project.status, liveClips, totalClips, completedClips);

    return NextResponse.json({
      success: true,
      status: project.status,
      error: project.error ?? null,
      videoUrl: project.videoUrl ?? project.generatedVideoUrl ?? null,
      script: project.script ?? null,
      progress: {
        totalClips,
        completedClips,
        currentStage,
        clips: liveClips,
      },
    });
  } catch (error) {
    console.error("[API Status] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
