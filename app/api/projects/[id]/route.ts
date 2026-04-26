import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { z } from "zod";

const UpdateProjectSchema = z.object({
    // Draft updates
    script: z.record(z.string(), z.unknown()),
    uploadedImages: z.array(z.string()).optional(),
    // Scheduling updates
    scheduledAt: z.string().optional(),
    platforms: z.array(z.string()).optional(),

    // Action flags
    cancelSchedule: z.boolean().optional(),
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const project = await Project.findOne({ _id: id, userId: user._id }).lean();
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        return NextResponse.json({
            success: true,
            project: {
                _id: project._id.toString(),
                title: project.title,
                status: project.status,
                createdAt: project.createdAt.toISOString(),
                videoUrl: (project as unknown as { generatedVideoUrl?: string }).generatedVideoUrl || null,
                script: project.script || null,
                thumbnail: (project as unknown as { uploadedImages?: string[] }).uploadedImages?.[0] || null,
                scheduledAt: project.scheduledAt ? project.scheduledAt.toISOString() : null,
                socialPlatforms: (project as unknown as { socialPlatforms?: string[] }).socialPlatforms || [],
                socialStatus: (project as unknown as { socialStatus?: string }).socialStatus || "idle"
            }
        });
    } catch (error) {
        console.error("[API Project GET ID] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const result = UpdateProjectSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error.issues }, { status: 400 });
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const data = result.data;
        let updateData: Record<string, unknown> = {};

        if (data.cancelSchedule) {
            updateData = {
                scheduledAt: null,
                socialStatus: "idle"
            };
        } else if (data.scheduledAt) {
            updateData = {
                scheduledAt: new Date(data.scheduledAt),
                socialPlatforms: data.platforms || [],
                socialStatus: "scheduled"
            };
        } else {
            // General draft update
            if (data.script) updateData.script = data.script;
            if (data.uploadedImages) updateData.uploadedImages = data.uploadedImages;
        }

        const project = await Project.findOneAndUpdate(
            { _id: id, userId: user._id },
            { $set: updateData },
            { new: true }
        );

        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API Project PATCH ID] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
