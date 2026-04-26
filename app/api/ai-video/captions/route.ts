import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { deductCredits } from "@/lib/credits";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CaptionsRequestSchema = z.object({
    script: z.object({
        video_style: z.string(),
        tone: z.string(),
        scenes: z.array(z.object({
            script: z.string(),
            visual_direction: z.string(),
        })),
        cta: z.string(),
    }),
    industry: z.string().optional(),
    platforms: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const parsed = CaptionsRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const { script, industry, platforms } = parsed.data;

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const creditResult = await deductCredits(user._id.toString(), "captions");
        if (!creditResult.success) {
            return NextResponse.json({ error: creditResult.error }, { status: 403 });
        }

        const scriptSummary = script.scenes.map((s, i) => `Scene ${i + 1}: ${s.script}`).join("\n");
        const platformList = (platforms?.length ? platforms : ["TikTok", "Instagram"]).join(", ");

        const prompt = `You are a social media copywriter. Generate optimised captions and hashtags for a ${script.video_style} short-form video with a ${script.tone} tone${industry ? ` in the ${industry} industry` : ""}.

Script summary:
${scriptSummary}
CTA: ${script.cta}

Target platforms: ${platformList}

Return a JSON object with:
- captions: array of 3 caption variations (each 1–3 sentences, platform-friendly, engaging, includes the CTA naturally)
- hashtags: array of 15 high-engagement hashtags relevant to the content and industry (no # prefix, lowercase)`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.8,
        });

        const raw = completion.choices[0].message.content || "{}";
        const result = JSON.parse(raw) as { captions?: string[]; hashtags?: string[] };

        const captions: string[] = Array.isArray(result.captions) ? result.captions : [];
        const hashtags: string[] = Array.isArray(result.hashtags)
            ? result.hashtags.map((h: string) => `#${h.replace(/^#/, "")}`)
            : [];

        return NextResponse.json({
            success: true,
            captions,
            hashtags,
            creditsRemaining: creditResult.remaining,
            creditsCost: creditResult.cost,
        });
    } catch (error) {
        console.error("[API AI-Video Captions] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
