import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const SuggestionRequestSchema = z.object({
    industry: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = SuggestionRequestSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Industry is required" }, { status: 400 });
        }

        const { industry } = result.data;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        const { text } = await generateText({
            model: openai("gpt-4o-mini"),
            prompt: `Generate 3 viral video ideas for a social media creator in the ${industry} industry. 
            Each idea should be concise (max 15 words) and catchy.
            Return ONLY a JSON array of strings. Example: ["Property Tour: Luxury Penthouse", "3 Tips for First-Time Home Buyers"]`,
        });

        try {
            const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const suggestions = JSON.parse(cleaned) as string[];
            return NextResponse.json({ success: true, suggestions });
        } catch {
            return NextResponse.json({ 
                success: true, 
                suggestions: ["Property Tour: Stunning Modern View", "Tips for New Buyers", "Market Update 2026"] 
            });
        }
    } catch (error) {
        console.error("[API Industries Suggestions] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
