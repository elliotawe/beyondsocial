import { NextRequest, NextResponse } from "next/server";
import { generateContentIdeas } from "@/lib/discovery-service";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { deductCredits } from "@/lib/credits";
import { z } from "zod";

const TrendingRequestSchema = z.object({
    topic: z.string().min(1, "Topic is required"),
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = TrendingRequestSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const { topic } = result.data;

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const creditResult = await deductCredits(user._id.toString(), "discovery");
        if (!creditResult.success) {
            return NextResponse.json({ error: creditResult.error }, { status: 403 });
        }

        console.log(`[API Discovery] Generating content strategy for: ${topic}`);
        const ideaSet = await generateContentIdeas(topic);
        console.log(`[API Discovery] Generated ${ideaSet.ideas.length} ideas.`);

        return NextResponse.json({
            success: true,
            ...ideaSet,
            creditsRemaining: creditResult.remaining,
            creditsCost: creditResult.cost,
        });
    } catch (error) {
        console.error("[API Discovery Trending] Fatal Error:", error);
        return NextResponse.json({ error: "Content ideation engine failed" }, { status: 500 });
    }
}
