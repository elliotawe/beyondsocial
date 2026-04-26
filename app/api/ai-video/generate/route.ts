import { NextRequest, NextResponse } from "next/server";
import * as aiService from "@/lib/ai-service";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { Job } from "@/models/Job";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { deductCredits, refundCredits } from "@/lib/credits";
import { z } from "zod";

const GenerateRequestSchema = z.object({
    imageUrl: z.string().url(),
    prompt: z.string().min(1),
    scriptData: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = GenerateRequestSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error.issues }, { status: 400 });
        }

        const { imageUrl, prompt, scriptData } = result.data;

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ error: "User not found in database." }, { status: 404 });

        const creditResult = await deductCredits(user._id.toString(), "video_generation");
        if (!creditResult.success) {
            return NextResponse.json({ error: creditResult.error }, { status: 403 });
        }

        const project = await Project.create({
            userId: user._id,
            title: (scriptData.roughIdea as string) || "Untitled Video",
            status: "processing",
            roughIdea: scriptData.roughIdea,
            script: scriptData,
            uploadedImages: [imageUrl],
        });

        try {
            const { taskId } = await aiService.generateWanVideo(imageUrl, prompt);

            project.taskId = taskId;
            await project.save();

            await Job.create({
                userId: user._id,
                type: "video_generation",
                status: "processing",
                payload: { projectId: project._id, imageUrl, prompt },
                providerTaskId: taskId,
            });

            return NextResponse.json({
                success: true,
                projectId: project._id.toString(),
                taskId,
                creditsRemaining: creditResult.remaining,
                creditsCost: creditResult.cost,
            });
        } catch (err: unknown) {
            // Refund on Wan AI submission failure
            await refundCredits(user._id.toString(), "video_generation", project._id.toString());
            project.status = "failed";
            await project.save();

            const message = err instanceof Error ? err.message : "Failed to submit video task.";
            return NextResponse.json({ error: message }, { status: 500 });
        }
    } catch (error) {
        console.error("[API AI-Video Generate] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
