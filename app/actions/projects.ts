"use server";

import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { auth } from "@/auth";
import { User } from "@/models/User";

export async function getUserProjects() {
    const session = await auth();
    if (!session?.user?.email) return [];

    await connectDB();

    // Find user by email to get their ID
    const user = await User.findOne({ email: session.user.email });
    if (!user) return [];

    const projects = await Project.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

    return projects.map((p: any) => ({
        _id: p._id.toString(),
        title: p.title,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        videoUrl: p.generatedVideoUrl || null,
        thumbnail: p.uploadedImages?.[0] || null,
        socialStatus: p.socialStatus || "idle",
        analytics: p.analytics || { views: 0, engagement: 0, shares: 0 },
        performanceScore: p.performanceScore || 0
    }));
}

export async function getProjectById(id: string) {
    const session = await auth();
    if (!session?.user?.email) return null;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return null;

    const project = await Project.findOne({ _id: id, userId: user._id }).lean();
    if (!project) return null;

    return {
        _id: project._id.toString(),
        title: project.title,
        status: project.status,
        createdAt: project.createdAt.toISOString(),
        videoUrl: project.generatedVideoUrl || null,
        script: project.script || null,
        thumbnail: project.uploadedImages?.[0] || null,
        scheduledAt: project.scheduledAt ? project.scheduledAt.toISOString() : null,
        socialPlatforms: project.socialPlatforms || [],
        socialStatus: project.socialStatus || "idle"
    };
}

export async function createProjectDraft(data: { title: string; roughIdea: string; style?: string; tone?: string }) {
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) throw new Error("User not found");

    const project = await Project.create({
        userId: user._id,
        title: data.title || "Untitled Draft",
        roughIdea: data.roughIdea,
        status: "draft",
        script: {
            video_style: data.style,
            tone: data.tone
        }
    });

    return { projectId: project._id.toString() };
}

export async function updateProjectDraft(id: string, data: { script?: any; uploadedImages?: string[] }) {
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");

    await connectDB();
    const user = await User.findOne({ email: session.user.email });

    const updateData: any = {};
    if (data.script) updateData.script = data.script;
    if (data.uploadedImages) updateData.uploadedImages = data.uploadedImages;

    const project = await Project.findOneAndUpdate(
        { _id: id, userId: user._id },
        { $set: updateData },
        { new: true }
    );

    if (!project) throw new Error("Project not found");
    return { success: true };
}

export async function scheduleProjectPost(id: string, data: { scheduledAt: string; platforms: string[] }) {
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) throw new Error("User not found");

    const project = await Project.findOneAndUpdate(
        { _id: id, userId: user._id },
        {
            $set: {
                scheduledAt: new Date(data.scheduledAt),
                socialPlatforms: data.platforms,
                socialStatus: "scheduled"
            }
        },
        { new: true }
    );

    if (!project) throw new Error("Project not found");
    return { success: true };
}

export async function cancelProjectSchedule(id: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) throw new Error("User not found");

    const project = await Project.findOneAndUpdate(
        { _id: id, userId: user._id },
        {
            $set: {
                scheduledAt: null,
                socialStatus: "idle"
            }
        },
        { new: true }
    );

    if (!project) throw new Error("Project not found");
    return { success: true };
}

export async function getCalendarEvents() {
    const session = await auth();
    if (!session?.user?.email) return [];

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return [];

    const projects = await Project.find({
        userId: user._id,
        $or: [
            { scheduledAt: { $ne: null } },
            { socialStatus: "posted" }
        ]
    }).lean();

    return projects.map((p: any) => ({
        _id: p._id.toString(),
        title: p.title,
        date: p.scheduledAt || p.updatedAt, // Use updatedAt as fallback for posted
        status: p.socialStatus,
        thumbnail: p.uploadedImages?.[0] || null
    }));
}
