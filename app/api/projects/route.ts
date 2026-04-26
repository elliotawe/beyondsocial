import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { z } from "zod";

const CreateDraftSchema = z.object({
    title: z.string().optional(),
    roughIdea: z.string().min(1),
    style: z.string().optional(),
    tone: z.string().optional(),
    useClonedVoice: z.boolean().optional(),
});

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ success: true, projects: [] });
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ success: true, projects: [] });

        const projects = await Project.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        return NextResponse.json({
            success: true,
            projects: projects.map((p: Record<string, unknown>) => ({
                _id: String(p._id),
                title: p.title as string,
                status: p.status as string,
                createdAt: (p.createdAt as Date).toISOString(),
                videoUrl: (p.generatedVideoUrl as string) || null,
                thumbnail: (p.uploadedImages as string[])?.[0] || null,
                socialStatus: (p.socialStatus as string) || "idle",
                analytics: (p.analytics as Record<string, number>) || { views: 0, engagement: 0, shares: 0 },
                performanceScore: (p.performanceScore as number) || 0
            }))
        });
    } catch (error) {
        console.error("[API Projects GET] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = CreateDraftSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error.issues }, { status: 400 });
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const data = result.data;
        const project = await Project.create({
            userId: user._id,
            title: data.title || "Untitled Draft",
            roughIdea: data.roughIdea,
            status: "draft",
            script: {
                video_style: data.style,
                tone: data.tone,
                useClonedVoice: data.useClonedVoice
            }
        });

        return NextResponse.json({ 
            success: true, 
            projectId: project._id.toString() 
        });
    } catch (error) {
        console.error("[API Projects POST] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
