import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import redis from "./lib/redis";
import connectDB from "./lib/db";
import { Job } from "./models/Job";
import { Project } from "./models/Project";
import { refineVideoIdea, generateWanVideo, getWanVideoStatus } from "./app/actions/ai-video";
// Note: We might need to refactor actions to be pure functions if they rely on "use server" context which might not work in standalone worker easily without build. 
// However, since they are just functions, it should be fine if we import the logic or move logic to a shared lib.
// Check app/actions/ai-video.ts content. It has "use server" at top.
// Importing "use server" files in a standalone worker script might fail in some Next.js setups or work fine in others depending on how it's bundled.
// Safer approach: Move core logic to `lib/ai-service.ts` and have both actions and worker use it.

import { postVideoToSocial } from "./lib/social-service";
import { fetchProjectAnalytics } from "./lib/analytics-service";

async function startWorker() {
    console.log("Worker started...");
    await connectDB();

    // Start scheduler loop in background
    startScheduler();

    // Start analytics loop in background
    startAnalyticsLoop();

    while (true) {
        try {
            // Blocking pop from Redis list "jobs"
            // redis.blpop returns [key, value]
            const result = await redis.blpop("jobs", 0);
            if (result) {
                const jobData = JSON.parse(result[1]);
                console.log("Processing job:", jobData.id);
                await processJob(jobData);
            }
        } catch (error) {
            console.error("Worker error:", error);
            // Sleep a bit on crucial error to avoid tight loop
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

async function processJob(jobMsg: { id: string }) {
    const job = await Job.findById(jobMsg.id);
    if (!job) return;

    job.status = "processing";
    await job.save();

    try {
        if (job.type === "video_generation") {
            // Logic: 
            // 1. Check if we need to refine script or if it's already refined
            // 2. Call Wan AI
            // 3. Poll Wan AI (or pushing a polling job? keeping it simple for now)
            // The PRD says: "Responsibility: Handle async jobs...".
            // If Wan AI is async, we trigger it, get a Task ID, and then we need to poll it.
            // We can use a different approach: trigger -> save taskID -> put "poll_job" back into queue with delay?
            // Or just simple polling loop here if it's < few mins.

            const { projectId, imageUrl, prompt } = job.payload;

            // Trigger generation
            const { taskId } = await generateWanVideo(imageUrl, prompt);

            // Update Project with Task ID
            await Project.findByIdAndUpdate(projectId, { taskId, status: "processing" });

            // We need to poll now. 
            // Ideally: Add a refined job to the queue "poll_wan_video" with taskId
            // For simplicity/v1: Poll here (blocking this worker thread) or use scheduled checks.
            // Let's block for now (simple, but limits concurrency).

            let status = "PENDING";
            let videoUrl = null;
            let retries = 0;
            while (status !== "SUCCEEDED" && status !== "FAILED" && retries < 60) { // 3 mins max
                await new Promise(r => setTimeout(r, 3000));
                const res = await getWanVideoStatus(taskId);
                status = res.status;
                videoUrl = res.videoUrl;
                retries++;
            }

            if (status === "SUCCEEDED" && videoUrl) {
                await Project.findByIdAndUpdate(projectId, {
                    status: "completed",
                    generatedVideoUrl: videoUrl
                });
                job.status = "completed";
                job.result = { videoUrl };
            } else {
                throw new Error("Video generation timed out or failed: " + status);
            }
        }
        await job.save();
    } catch (e: any) {
        console.error("Job failed", e);
        job.status = "failed";
        job.error = e.message;
        await job.save();

        await Project.findByIdAndUpdate(job.payload.projectId, { status: "failed" });
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
                    } catch (err: any) {
                        console.error(`[Scheduler] Error processing project ${project._id}:`, err);
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
