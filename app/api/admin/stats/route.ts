import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { Job } from "@/models/Job";

async function ensureAdmin() {
    const session = await auth();
    if (!session?.user?.email) return null;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== "admin") return null;
    return user;
}

export async function GET() {
    try {
        const admin = await ensureAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

        return NextResponse.json({
            success: true,
            stats: {
                totalUsers,
                totalProjects,
                totalJobs,
                activeUsers,
                recentJobs: recentJobs.map((j: Record<string, unknown>) => ({
                    _id: String(j._id),
                    type: j.type,
                    status: j.status,
                    createdAt: (j.createdAt as Date).toISOString()
                }))
            }
        });
    } catch (error) {
        console.error("[API Admin Stats] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
