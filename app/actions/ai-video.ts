"use server";

import * as aiService from "@/lib/ai-service";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { Job } from "@/models/Job";
import { User } from "@/models/User";
import { auth } from "@/auth";
// import type { RefinedScript } from "@/lib/ai-service";

export async function refineVideoIdea(idea: string, style?: string, tone?: string, industry?: string, realEstateMode?: boolean) {
    const session = await auth();
    let userId = undefined;

    if (session?.user?.email) {
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (user) userId = user._id.toString();
    }

    return aiService.refineVideoIdea(idea, style, tone, userId, industry, realEstateMode);
}

export async function createVideoGenerationJob(imageUrl: string, prompt: string, scriptData: Record<string, unknown>) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("Unauthorized");
    }

    await connectDB();

    // Find user (using email for now as auth provider might not map ID perfectly yet)
    const user = await User.findOne({ email: session.user.email });

    // If user doesn't exist in our DB yet (first login via standard NextAuth), create them or throw?
    // NextAuth MongoDB adapter should have created them. 
    // If using adapter, user.id from session should match _id in DB.
    if (!user) {
        // Fallback for safety
        throw new Error("User not found in database.");
    }

    if (user.credits < 1) {
        throw new Error("Insufficient credits. Please upgrade your plan.");
    }

    // Deduct credit
    user.credits -= 1;
    await user.save();

    // Create Project
    const project = await Project.create({
        userId: user._id,
        title: scriptData.roughIdea || "Untitled Video",
        status: "processing",
        roughIdea: scriptData.roughIdea,
        script: scriptData,
        uploadedImages: [imageUrl],
    });

    try {
        // Submit directly to Wan AI
        const { taskId } = await aiService.generateWanVideo(imageUrl, prompt);

        // Update project with taskId
        project.taskId = taskId;
        await project.save();

        // Create Job record for history/tracking (optional, but good for visibility)
        await Job.create({
            userId: user._id,
            type: "video_generation",
            status: "processing",
            payload: {
                projectId: project._id,
                imageUrl,
                prompt
            },
            providerTaskId: taskId
        });

        return {
            projectId: project._id.toString(),
            taskId
        };
    } catch (err: unknown) {
        // Fallback: Credit reversal if submission fails
        user.credits += 1;
        await user.save();

        project.status = "failed";
        await project.save();

        const message = err instanceof Error ? err.message : "Failed to submit video task.";
        throw new Error(message);
    }
}

export async function getProjectStatus(projectId: string) {
    // Check auth
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await connectDB();

    const project = await Project.findById(projectId).lean();
    if (!project) throw new Error("Project not found");

    // Enforce ownership check
    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user || project.userId.toString() !== user._id.toString()) {
        throw new Error("Forbidden: You do not own this project.");
    }

    // Direct status check as a fallback/accelerator for the UI poll
    if (project.status === "processing" && project.taskId) {
        try {
            const wanStatus = await aiService.getWanVideoStatus(project.taskId);
            if (wanStatus.status === "SUCCEEDED" && wanStatus.videoUrl) {
                await Project.findByIdAndUpdate(projectId, {
                    status: "completed",
                    generatedVideoUrl: wanStatus.videoUrl
                });
                return {
                    status: "completed",
                    videoUrl: wanStatus.videoUrl,
                    script: project.script,
                    taskId: project.taskId
                };
            } else if (wanStatus.status === "FAILED") {
                await Project.findByIdAndUpdate(projectId, { status: "failed" });
                return {
                    status: "failed",
                    videoUrl: project.generatedVideoUrl,
                    script: project.script,
                    taskId: project.taskId
                };
            }
        } catch (err) {
            console.error("Direct poll failed", err);
        }
    }

    return {
        status: project.status,
        videoUrl: project.generatedVideoUrl || null,
        script: project.script ? JSON.parse(JSON.stringify(project.script)) : null,
        taskId: project.taskId || null
    };
}

// Keep legacy export for temporary compatibility or direct calling if needed
export const generateWanVideo = aiService.generateWanVideo;
export const getWanVideoStatus = aiService.getWanVideoStatus;
