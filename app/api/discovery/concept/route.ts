import { NextRequest, NextResponse } from "next/server";
import { generateScriptFromIdea, IdeaSchema } from "@/lib/discovery-service";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { deductCredits } from "@/lib/credits";
import { z } from "zod";

const ConceptRequestSchema = z.object({
    idea: IdeaSchema,
    topic: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = ConceptRequestSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Invalid selection data", details: result.error.issues }, { status: 400 });
        }

        const { idea, topic } = result.data;

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const creditResult = await deductCredits(user._id.toString(), "concept");
        if (!creditResult.success) {
            return NextResponse.json({ error: creditResult.error }, { status: 403 });
        }

        console.log(`[API Discovery Concept] Generating script for idea: ${idea.title}`);
        const concept = await generateScriptFromIdea(idea, topic);

        return NextResponse.json({
            success: true,
            concept,
            creditsRemaining: creditResult.remaining,
            creditsCost: creditResult.cost,
        });
    } catch (error) {
        console.error("[API Discovery Concept] Error:", error);
        return NextResponse.json({ error: "Failed to generate video script" }, { status: 500 });
    }
}
