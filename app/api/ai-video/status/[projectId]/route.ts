import { NextRequest, NextResponse } from "next/server";
import * as aiService from "@/lib/ai-service";
import * as cloudinaryService from "@/lib/cloudinary-service";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { auth } from "@/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Check auth
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const project = await Project.findById(projectId).lean();
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Enforce ownership check
        const user = await User.findOne({ email: session.user.email }).lean();
        if (!user || project.userId.toString() !== user._id.toString()) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Direct status check as a fallback/accelerator for the UI poll
        if (project.status === "processing" && project.taskId) {
            try {
                const wanStatus = await aiService.getWanVideoStatus(project.taskId);
                if (wanStatus.status === "SUCCEEDED" && wanStatus.videoUrl) {
                    // 1. Upload to Cloudinary for permanent storage as requested
                    console.log(`[Status Poll] Video succeeded. Migrating to Cloudinary: ${projectId}`);
                    let cloudinaryData = null;
                    try {
                        cloudinaryData = await cloudinaryService.uploadVideo(wanStatus.videoUrl, {
                            folder: `beyond-social/${user._id}`,
                            tags: ["generated", "ai-video", project.title],
                            metadata: {
                                projectId: projectId,
                                originalTitle: project.title,
                                userId: user._id.toString()
                            }
                        });
                    } catch (uploadErr) {
                        console.error("[Status Poll] Cloudinary migration failed, falling back to Wan URL", uploadErr);
                    }

                    // 2. Update project with final assets
                    await Project.findByIdAndUpdate(projectId, {
                        status: "completed",
                        generatedVideoUrl: cloudinaryData?.secure_url || wanStatus.videoUrl, // Use permanent URL if available
                        cloudinaryUrl: cloudinaryData?.secure_url,
                        cloudinaryPublicId: cloudinaryData?.public_id
                    });

                    return NextResponse.json({
                        success: true,
                        status: "completed",
                        videoUrl: cloudinaryData?.secure_url || wanStatus.videoUrl,
                        script: project.script,
                        taskId: project.taskId
                    });
                } else if (wanStatus.status === "FAILED") {
                    await Project.findByIdAndUpdate(projectId, { status: "failed" });
                    return NextResponse.json({
                        success: true,
                        status: "failed",
                        videoUrl: project.generatedVideoUrl,
                        script: project.script,
                        taskId: project.taskId
                    });
                }
            } catch (err) {
                console.error("Direct poll failed", err);
            }
        }

        return NextResponse.json({
            success: true,
            status: project.status,
            videoUrl: (project as unknown as { generatedVideoUrl?: string }).generatedVideoUrl || null,
            script: project.script,
            taskId: (project as unknown as { taskId?: string }).taskId || null
        });
    } catch (error) {
        console.error("[API AI-Video Status] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
