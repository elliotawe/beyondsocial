import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import connectDB from "./lib/db";
import { Job } from "./models/Job";
import { Project } from "./models/Project";
import {
    // refineVideoIdea, 
    getWanVideoStatus
} from "./app/actions/ai-video";
// Note: We might need to refactor actions to be pure functions if they rely on "use server" context which might not work in standalone worker easily without build. 
// However, since they are just functions, it should be fine if we import the logic or move logic to a shared lib.
// Check app/actions/ai-video.ts content. It has "use server" at top.
// Importing "use server" files in a standalone worker script might fail in some Next.js setups or work fine in others depending on how it's bundled.
// Safer approach: Move core logic to `lib/ai-service.ts` and have both actions and worker use it.

import { postVideoToSocial } from "./lib/social-service";
import { fetchProjectAnalytics } from "./lib/analytics-service";

async function startWorker() {
    console.log("Worker started (MongoDB Only Mode)...");
    await connectDB();

    // Start status sync loop in background
    startStatusSyncLoop();

    // Start scheduler loop in background
    startScheduler();

    // Start analytics loop in background
    startAnalyticsLoop();
}

/**
 * Polls Wan AI for tasks associated with projects in "processing" status
 */
async function startStatusSyncLoop() {
    console.log("Status sync loop started...");
    while (true) {
        try {
            const processingProjects = await Project.find({
                status: "processing",
                taskId: { $exists: true, $ne: null }
            });

            if (processingProjects.length > 0) {
                console.log(`[StatusSync] Checking ${processingProjects.length} processing projects.`);
                for (const project of processingProjects) {
                    try {
                        const res = await getWanVideoStatus(project.taskId);
                        if (res.status === "SUCCEEDED" && res.videoUrl) {
                            console.log(`[StatusSync] Project ${project._id} SUCCEEDED.`);
                            project.status = "completed";
                            project.generatedVideoUrl = res.videoUrl;
                            await project.save();

                            // Update associated Job record if exists
                            await Job.findOneAndUpdate(
                                { "payload.projectId": project._id, type: "video_generation" },
                                { status: "completed", result: { videoUrl: res.videoUrl } }
                            );
                        } else if (res.status === "FAILED") {
                            console.log(`[StatusSync] Project ${project._id} FAILED.`);
                            project.status = "failed";
                            await project.save();

                            await Job.findOneAndUpdate(
                                { "payload.projectId": project._id, type: "video_generation" },
                                { status: "failed", error: res.message || "Wan AI Generation Failed" }
                            );
                        }
                        // If PENDING/RUNNING, just wait for next loop
                    } catch (err: unknown) {
                        console.error(`[StatusSync] Error checking project ${project._id}:`, err);
                    }
                }
            }
        } catch (error) {
            console.error("Status sync loop error:", error);
        }
        // Poll every 10 seconds for efficiency (since frontend also has an accelerator poll)
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

async function startScheduler() {
    console.log("Scheduler started...");
    while (true) {
        try {
            const now = new Date();
            // Find projects that are scheduled and due
            const dueProjects = await Project.find({
                socialStatus: "scheduled",
                scheduledAt: { $lte: now }
            });

            if (dueProjects.length > 0) {
                console.log(`[Scheduler] Found ${dueProjects.length} due posts.`);
                for (const project of dueProjects) {
                    try {
                        console.log(`[Scheduler] Posting project: ${project._id}`);

                        // Create a Job record for tracking if not already exists (optional but good)
                        const job = await Job.create({
                            userId: project.userId,
                            type: "social_post",
                            status: "processing",
                            payload: { projectId: project._id, videoUrl: project.generatedVideoUrl }
                        });

                        const results = await postVideoToSocial(
                            project.generatedVideoUrl,
                            project.script?.cta || project.title,
                            project.socialPlatforms
                        );

                        const allSuccess = results.every(r => r.success);

                        if (allSuccess) {
                            project.socialStatus = "posted";
                            project.retryCount = 0; // Reset on success
                            job.status = "completed";
                        } else {
                            // Retry logic
                            if (project.retryCount < 3) {
                                project.retryCount += 1;
                                project.socialStatus = "scheduled";
                                // Exponential backoff: 5m, 10m, 20m...
                                const delayMs = Math.pow(2, project.retryCount) * 5 * 60 * 1000;
                                project.scheduledAt = new Date(Date.now() + delayMs);
                                console.log(`[Scheduler] Post failed for ${project._id}. Retrying attempt ${project.retryCount} at ${project.scheduledAt}`);
                                job.status = "failed"; // This specific job failed, but project will retry
                            } else {
                                project.socialStatus = "failed";
                                job.status = "failed";
                                console.log(`[Scheduler] Post failed for ${project._id} after 3 attempts. Permanently failed.`);
                            }
                        }

                        await project.save();
                        job.result = results;
                        await job.save();
                    } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : "Unknown error";
                        console.error(`[Scheduler] Error processing project ${project._id}:`, message);
                        project.socialStatus = "failed";
                        await project.save();
                    }
                }
            }
        } catch (error) {
            console.error("Scheduler error:", error);
        }
        // Check every 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

async function startAnalyticsLoop() {
    console.log("Analytics loop started...");
    while (true) {
        try {
            // Find projects that are posted and need analytics update
            // For simulation, we just update all "posted" projects every few minutes
            const postedProjects = await Project.find({ socialStatus: "posted" });

            if (postedProjects.length > 0) {
                console.log(`[AnalyticsLoop] Updating stats for ${postedProjects.length} projects.`);
                for (const project of postedProjects) {
                    try {
                        const stats = await fetchProjectAnalytics(project._id.toString());

                        project.analytics = {
                            views: stats.views,
                            engagement: stats.engagement,
                            shares: stats.shares
                        };
                        project.performanceScore = stats.performanceScore;
                        await project.save();

                        console.log(`[AnalyticsLoop] Updated project ${project._id}: Score ${project.performanceScore}`);
                    } catch (err) {
                        console.error(`[AnalyticsLoop] Error updating project ${project._id}:`, err);
                    }
                }
            }
        } catch (error) {
            console.error("Analytics loop error:", error);
        }
        // Sync every 2 minutes for simulation
        await new Promise(resolve => setTimeout(resolve, 120000));
    }
}

startWorker();
