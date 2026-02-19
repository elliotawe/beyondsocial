"use server";

import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { Job } from "@/models/Job";
import { auth } from "@/auth";

async function ensureAdmin() {
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== "admin") {
        throw new Error("Forbidden: Admin access only.");
    }
    return user;
}

export async function getAdminStats() {
    await ensureAdmin();

    const [totalUsers, totalProjects, totalJobs, activeUsers] = await Promise.all([
        User.countDocuments(),
        Project.countDocuments(),
        Job.countDocuments(),
        User.countDocuments({ updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);

    const recentJobs = await Job.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    return {
        totalUsers,
        totalProjects,
        totalJobs,
        activeUsers,
        recentJobs: recentJobs.map((j: { _id: { toString: () => string }, type: string, status: string, createdAt: { coachingat?: string, isostring: () => string, toISOString: () => string } }) => ({
            _id: j._id.toString(),
            type: j.type,
            status: j.status,
            createdAt: j.createdAt.toISOString()
        }))
    };
}

export async function getAllUsers() {
    await ensureAdmin();

    const users = await User.find().sort({ createdAt: -1 }).lean();

    return users.map((u: { _id: { toString: () => string }, name?: string, email: string, planTier: string, credits: number, role: string, createdAt: { toISOString: () => string } }) => ({
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        planTier: u.planTier,
        credits: u.credits,
        role: u.role,
        createdAt: u.createdAt.toISOString()
    }));
}

export async function updateUserCredits(userId: string, newCredits: number) {
    await ensureAdmin();

    const user = await User.findByIdAndUpdate(userId, { credits: newCredits }, { new: true });
    if (!user) throw new Error("User not found");

    return { success: true };
}
