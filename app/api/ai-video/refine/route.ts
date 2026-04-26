import { NextRequest, NextResponse } from "next/server";
import * as aiService from "@/lib/ai-service";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { deductCredits } from "@/lib/credits";
import { z } from "zod";

const RefineRequestSchema = z.object({
    idea: z.string().min(1),
    style: z.string().optional(),
    tone: z.string().optional(),
    industry: z.string().optional(),
    realEstateMode: z.boolean().optional(),
    suggestedScript: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = RefineRequestSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error.issues }, { status: 400 });
        }

        const { idea, style, tone, industry, realEstateMode, suggestedScript } = result.data;

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const creditResult = await deductCredits(user._id.toString(), "script_refine");
        if (!creditResult.success) {
            return NextResponse.json({ error: creditResult.error }, { status: 403 });
        }

        const refined = await aiService.refineVideoIdea(
            idea, style, tone, user._id.toString(), industry, realEstateMode, suggestedScript
        );

        return NextResponse.json({
            success: true,
            refined,
            creditsRemaining: creditResult.remaining,
            creditsCost: creditResult.cost,
        });
    } catch (error) {
        console.error("[API AI-Video Refine] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
