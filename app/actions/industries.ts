"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function getIndustrySuggestions(industry: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `Generate 3 viral video ideas for a social media creator in the ${industry} industry. 
        Each idea should be concise (max 15 words) and catchy.
        Return ONLY a JSON array of strings. Example: ["Property Tour: Luxury Penthouse", "3 Tips for First-Time Home Buyers"]`,
    });

    try {
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleaned) as string[];
    } catch {
        return ["Property Tour: Stunning Modern View", "Tips for New Buyers", "Market Update 2026"];
    }
}
