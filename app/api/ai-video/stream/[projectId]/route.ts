import { NextRequest } from "next/server";

export const maxDuration = 300;
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

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function safeGetFalStatus(
  model: string,
  requestId: string
): Promise<{ status: FalStatus; queuePosition?: number }> {
  try {
    const res = await fal.queue.status(model, { requestId, logs: false });
    return {
      status: res.status as FalStatus,
      queuePosition: (res as unknown as Record<string, unknown>)
        .queue_position as number | undefined,
    };
  } catch {
    return { status: "UNKNOWN" };
  }
}

async function getLiveClipStatuses(
  job: {
    avatarRequestId?: string;
    brollRequestIds?: string[];
  },
  completedClips: number
): Promise<ClipLiveStatus[]> {
  const avatarModel =
    process.env.CREATIFY_AURORA_MODEL ?? "fal-ai/creatify/aurora";
  const brollModel =
    process.env.KLING_MODEL ??
    "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";

  const tasks: Promise<ClipLiveStatus>[] = [];

  if (job.avatarRequestId) {
    if (completedClips >= 1) {
      tasks.push(
        Promise.resolve({ type: "avatar" as const, label: "Presenter clip", status: "COMPLETED" as const })
      );
    } else {
      tasks.push(
        safeGetFalStatus(avatarModel, job.avatarRequestId).then((s) => ({
          type: "avatar" as const,
          label: "Presenter clip",
          ...s,
        }))
      );
    }
  }

  const brollIds = job.brollRequestIds ?? [];
  for (let i = 0; i < brollIds.length; i++) {
    const rid = brollIds[i];
    const clipIndex = i + 1;
    const label = `Visual scene ${i + 1}`;

    if (!rid || rid === "FAILED") {
      tasks.push(
        Promise.resolve({ type: "broll" as const, label, status: "FAILED" as const })
      );
    } else if (completedClips > clipIndex) {
      tasks.push(
        Promise.resolve({ type: "broll" as const, label, status: "COMPLETED" as const })
      );
    } else {
      tasks.push(
        safeGetFalStatus(brollModel, rid).then((s) => ({
          type: "broll" as const,
          label,
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
  completedClips: number,
  hasAudio: boolean
): string {
  if (projectStatus === "queued") return "Getting your project ready…";
  if (projectStatus === "completed") return "Done";
  if (projectStatus === "failed") return "Failed";
  if (totalClips === 0) {
    if (hasAudio) return "Voiceover ready — generating your video clips now…";
    return "Planning your scenes and creating your voiceover…";
  }
  if (completedClips >= totalClips) return "All clips ready — assembling your final video…";
  if (clips.length === 0) return "Sending clips to render — waiting for confirmation…";

  const avatar = clips.find((c) => c.type === "avatar");
  const brolls = clips.filter((c) => c.type === "broll");

  if (avatar && (avatar.status === "IN_QUEUE" || avatar.status === "IN_PROGRESS")) {
    if (avatar.status === "IN_QUEUE") {
      const pos = avatar.queuePosition;
      return pos != null && pos > 0
        ? `Your presenter clip is in the render queue (position ${pos})…`
        : "Your presenter clip is queued for rendering…";
    }
    return "Rendering your presenter clip — hang tight…";
  }

  const pendingBrolls = brolls.filter(
    (c) => c.status === "IN_QUEUE" || c.status === "IN_PROGRESS"
  );

  if (pendingBrolls.length > 0) {
    const pendingNames = pendingBrolls.map((c) => c.label).join(", ");
    if (completedClips === 0) {
      return `Generating ${pendingBrolls.length} visual scene${pendingBrolls.length > 1 ? "s" : ""} (${pendingNames})…`;
    }
    return `${completedClips} of ${totalClips} clips done — still rendering ${pendingNames}…`;
  }

  if (completedClips > 0) return `${completedClips} of ${totalClips} clips done — assembling final video…`;
  return "Generating your video clips…";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();

  const user = await User.findOne({ email: session.user.email }).lean() as {
    _id: { toString(): string };
  } | null;

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const initialProject = await Project.findById(projectId).lean() as {
    _id: unknown;
    userId: { toString(): string };
    status: ProjectStatus;
    videoUrl?: string;
    generatedVideoUrl?: string;
    script?: unknown;
  } | null;

  if (!initialProject) {
    return new Response("Project not found", { status: 404 });
  }

  if (initialProject.userId.toString() !== user._id.toString()) {
    return new Response("Forbidden", { status: 403 });
  }

  const POLL_INTERVAL_MS = 4000;
  // Stay well under Vercel's 300s function limit. The client EventSource auto-reconnects
  // and will pick up where it left off on the next connection.
  const MAX_DURATION_MS = 270_000;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const push = (event: string, data: unknown) => {
        try {
          controller.enqueue(enc.encode(sseEvent(event, data)));
        } catch {
          // client already disconnected
        }
      };

      const startTime = Date.now();
      let done = false;

      while (!done) {
        if (req.signal.aborted) break;

        if (Date.now() - startTime > MAX_DURATION_MS) {
          // Graceful close before Vercel's hard kill. Send a reconnect hint so the
          // client knows this is a normal rotation, not a job failure.
          push("reconnect", {});
          break;
        }

        try {
          const project = await Project.findById(projectId).lean() as {
            status: ProjectStatus;
            videoUrl?: string;
            generatedVideoUrl?: string;
            script?: unknown;
            error?: string;
            avatarClipUrl?: string;
            brollClipUrls?: string[];
          } | null;

          if (!project) {
            push("error", { message: "Project not found." });
            break;
          }

          const job = await Job.findOne({ projectId }).lean() as {
            totalClips?: number;
            completedClips?: number;
            completedClipUrls?: string[];
            avatarRequestId?: string;
            brollRequestIds?: string[];
            audioUrl?: string;
          } | null;

          const totalClips = job?.totalClips ?? 0;
          const completedClips = job?.completedClips ?? 0;
          const hasAudio = !!(job?.audioUrl);

          let liveClips: ClipLiveStatus[] = [];
          if (
            project.status === "processing" &&
            job &&
            (job.avatarRequestId || (job.brollRequestIds?.length ?? 0) > 0) &&
            completedClips < totalClips
          ) {
            liveClips = await getLiveClipStatuses(job, completedClips);
          }

          const currentStage = humanStage(
            project.status,
            liveClips,
            totalClips,
            completedClips,
            hasAudio
          );

          push("progress", {
            status: project.status,
            error: project.error ?? null,
            videoUrl: project.videoUrl ?? project.generatedVideoUrl ?? null,
            script: project.script ?? null,
            progress: {
              totalClips,
              completedClips,
              currentStage,
              clips: liveClips,
              completedClipUrls: job?.completedClipUrls ?? [],
              audioUrl: job?.audioUrl ?? null,
              avatarClipUrl: project.avatarClipUrl ?? null,
              brollClipUrls: project.brollClipUrls ?? [],
            },
          });

          if (project.status === "completed" || project.status === "failed") {
            done = true;
            break;
          }
        } catch (err) {
          console.error("[SSE Stream] Error:", err);
          push("error", { message: "Internal error reading status." });
        }

        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, POLL_INTERVAL_MS);
          req.signal.addEventListener("abort", () => {
            clearTimeout(t);
            resolve();
          }, { once: true });
        });
      }

      try {
        controller.close();
      } catch {
        // already closed
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
