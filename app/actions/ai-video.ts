"use server";

import * as aiService from "@/lib/ai-service";
import connectDB from "@/lib/db";
import redis from "@/lib/redis";
import { Project } from "@/models/Project";
import { Job } from "@/models/Job";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { RefinedScript } from "@/lib/ai-service";

export type { RefinedScript }; // Re-export for frontend usage

export async function refineVideoIdea(idea: string, style?: string, tone?: string) {
    const session = await auth();
    let userId = undefined;

    if (session?.user?.email) {
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (user) userId = user._id.toString();
    }

    return aiService.refineVideoIdea(idea, style, tone, userId);
}

export async function createVideoGenerationJob(imageUrl: string, prompt: string, scriptData: any) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("Unauthorized");
    }

    await connectDB();

    // Find user (using email for now as auth provider might not map ID perfectly yet)
    let user = await User.findOne({ email: session.user.email });

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
        status: "processing", // Or 'queued'
        roughIdea: scriptData.roughIdea,
        script: scriptData,
        uploadedImages: [imageUrl],
    });

    // Create Job
    const job = await Job.create({
        userId: user._id,
        type: "video_generation",
        status: "pending",
        payload: {
            projectId: project._id,
            imageUrl,
            prompt
        }
    });

    // Push to Redis
    await redis.rpush("jobs", JSON.stringify({ id: job._id }));

    return { projectId: project._id.toString(), jobId: job._id.toString() };
}

export async function getProjectStatus(projectId: string) {
    // Check auth
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await connectDB();

    const project = await Project.findById(projectId);
    if (!project) throw new Error("Project not found");

    // Enforce ownership check
    const user = await User.findOne({ email: session.user.email });
    if (!user || project.userId.toString() !== user._id.toString()) {
        throw new Error("Forbidden: You do not own this project.");
    }

    return {
        status: project.status,
        videoUrl: project.generatedVideoUrl,
        script: project.script
    };
}

// Keep legacy export for temporary compatibility or direct calling if needed
export const generateWanVideo = aiService.generateWanVideo;
export const getWanVideoStatus = aiService.getWanVideoStatus;
