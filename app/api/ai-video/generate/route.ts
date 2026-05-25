import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { Job } from "@/models/Job";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { deductCredits, refundCredits } from "@/lib/credits";
import { inngest } from "@/inngest";
import { z } from "zod";

const GenerateRequestSchema = z.object({
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
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { scriptData } = result.data;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const creditResult = await deductCredits(
      user._id.toString(),
      "video_generation"
    );
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error }, { status: 403 });
    }

    // Load project to get ALL uploaded images (not just the one from the body)
    const projectId = scriptData.projectId as string | undefined;
    let project = projectId
      ? await Project.findById(projectId)
      : null;

    // If no project yet, create one now
    if (!project) {
      project = await Project.create({
        userId: user._id,
        title: (scriptData.roughIdea as string)?.slice(0, 60) || "Untitled Video",
        status: "queued",
        roughIdea: scriptData.roughIdea,
        script: scriptData,
        uploadedImages: [],
      });
    } else {
      // Sync latest script edits
      await Project.findByIdAndUpdate(project._id, {
        script: scriptData,
        status: "queued",
      });
    }

    const images: string[] = project.uploadedImages ?? [];
    const videoType: "person" | "product" | "property" = (project.videoType as "person" | "product" | "property") ?? "person";
    const portraitImageUrl: string | undefined = project.portraitImageUrl ?? undefined;

    if (videoType === "person" && !portraitImageUrl && images.length === 0) {
      await refundCredits(user._id.toString(), "video_generation");
      return NextResponse.json(
        { error: "No images found on this project. Please upload at least one image." },
        { status: 400 }
      );
    }

    if (videoType !== "person" && images.length === 0) {
      await refundCredits(user._id.toString(), "video_generation");
      return NextResponse.json(
        { error: "No content images found. Please upload at least one image." },
        { status: 400 }
      );
    }

    // Create Job record
    const job = await Job.create({
      userId: user._id,
      projectId: project._id,
      type: "video_generation",
      status: "pending",
      totalClips: 0,
      completedClips: 0,
    });

    // Fire Inngest event — returns immediately
    try {
      await inngest.send({
        name: "video/generate.requested",
        data: {
          projectId: project._id.toString(),
          jobId: job._id.toString(),
          userId: user._id.toString(),
          images,
          videoType,
          portraitImageUrl,
          refinedScript: scriptData,
          industry: (project.industry as string) || "",
          style: (scriptData.video_style as string) || "cinematic",
          tone: (scriptData.tone as string) || "professional",
          voice: project.voice as string | undefined,
          clonedVoiceUrl: (user.clonedVoiceUrl as string | undefined) ?? undefined,
        },
      });
    } catch (err) {
      // Inngest send failed — refund credits and clean up
      await refundCredits(user._id.toString(), "video_generation", project._id.toString());
      await Project.findByIdAndUpdate(project._id, { status: "failed" });
      await Job.findByIdAndUpdate(job._id, { status: "failed" });
      console.error("[API Generate] Inngest send failed:", err);
      return NextResponse.json(
        { error: "Failed to queue video generation. Credits have been refunded." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projectId: project._id.toString(),
      status: "queued",
      creditsRemaining: creditResult.remaining,
      creditsCost: creditResult.cost,
    });
  } catch (error) {
    console.error("[API Generate] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
