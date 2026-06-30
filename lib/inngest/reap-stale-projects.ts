import { inngest } from "@/inngest";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { refundCredits } from "@/lib/credits";

// How long a project may sit in each state before we consider it stuck.
// Queued → processing takes seconds in a healthy run; 6 min is generous for
// an Inngest event that was ingested but never delivered to the function.
// Processing → completed takes up to ~20 min worst-case (avatar 15m +
// shotstack 10m + fallback polls), so 30 min gives healthy runs plenty of room.
const STALE_QUEUED_MS     = 6  * 60 * 1000;
const STALE_PROCESSING_MS = 30 * 60 * 1000;

// Use the same step-type pattern the rest of the codebase uses.
type InngestStep = Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"];

export const reapStaleProjects = inngest.createFunction(
  {
    id: "reap-stale-projects",
    retries: 0,
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }: { step: InngestStep }) => {
    const now = Date.now();

    const staleProjects = await step.run("find-stale-projects", async () => {
      await connectDB();

      const candidates = await Project.find(
        { status: { $in: ["queued", "processing"] } },
        { _id: 1, userId: 1, status: 1, updatedAt: 1 }
      ).lean() as Array<{
        _id: { toString(): string };
        userId: { toString(): string };
        status: string;
        updatedAt: Date;
      }>;

      return candidates
        .filter((p) => {
          const age = now - new Date(p.updatedAt).getTime();
          return p.status === "queued"
            ? age > STALE_QUEUED_MS
            : age > STALE_PROCESSING_MS;
        })
        .map((p) => ({
          projectId: p._id.toString(),
          userId:    p.userId.toString(),
          status:    p.status,
        }));
    });

    if (staleProjects.length === 0) return { reaped: 0 };

    // Reap each stale project in its own step so one bad DB write doesn't
    // block the others.
    await Promise.all(
      staleProjects.map(({ projectId, userId, status }: { projectId: string; userId: string; status: string }) =>
        step.run(`reap-${projectId}`, async () => {
          await connectDB();

          const msg =
            status === "queued"
              ? "Video generation couldn't start. Please try again."
              : "Video generation timed out. Please try again.";

          await Project.findByIdAndUpdate(projectId, {
            status: "failed",
            error:  msg,
          });

          // refundCredits is idempotent — no-op if already refunded by an in-band handler.
          await refundCredits(userId, "video_generation", projectId);

          console.log(`[Watchdog] Reaped stale ${status} project ${projectId}`);
        })
      )
    );

    return { reaped: staleProjects.length };
  }
);
