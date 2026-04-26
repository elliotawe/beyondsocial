import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// --- Schemas & Types ---

/**
 * NEW: Schema for AI-generated content ideation.
 * Replaces the old scraper-based VideoSchema.
 */
export const IdeaSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    complexity: z.string().transform((val) => {
        const v = val.toLowerCase();
        if (v.includes("simple") || v.includes("easy")) return "simple";
        if (v.includes("complex") || v.includes("hard")) return "complex";
        return "moderate"; // Default to moderate for "medium", etc.
    }),
});
// ... (rest of the file remains same, but I'll update the prompt below)

export const IdeaSetSchema = z.object({
    ideas: z.array(IdeaSchema),
    hooks: z.array(z.string()),
    patterns: z.array(z.string()),
    formats: z.array(z.string()),
});

export type IdeaSet = z.infer<typeof IdeaSetSchema>;
export type Idea = z.infer<typeof IdeaSchema>;

/**
 * Schema for detailed video concepts/scripts.
 */
export const ConceptSchema = z.object({
    concept: z.string(),
    hook: z.string(),
    targetAudience: z.string(),
    suggestedScript: z.string(),
});

export type Concept = z.infer<typeof ConceptSchema>;

// --- Services ---

/**
 * Generates structured content ideas based on a user query.
 * NO longer uses scraping. Purely LLM-driven viral strategy.
 */
export async function generateContentIdeas(topic: string): Promise<IdeaSet> {
    try {
        console.log(`[Discovery] Simulating viral trends for: ${topic}`);

        const { text } = await generateText({
            model: openai("gpt-4o"),
            system: "You are a world-class social media strategist specializing in TikTok and Instagram Reels. Your goal is to generate viral content ideas that feel trending and high-conversion. You don't scrape; you simulate current trends based on your deep understanding of social media psychology.",
            prompt: `
                Generate a comprehensive content ideation set for the niche: "${topic}".
                
                You must return a JSON object with this exact structure:
                {
                    "ideas": [
                        { "id": "uuid1", "title": "The First Idea", "description": "Engaging description", "complexity": "moderate" }
                    ],
                    "hooks": ["Viral Hook 1", "Viral Hook 2"],
                    "patterns": ["Day in the life", "POV", "Tutorial"],
                    "formats": ["Listicle", "Talking Head", "Aesthetic B-roll"]
                }

                Requirements:
                - Generate 8-12 diverse video ideas.
                - Complexity must be exactly one of: "simple", "moderate", "complex".
                - Generate 6-10 powerful viral hooks.
                - Generate 3-5 content patterns.
                - Generate 3-5 optional formats.
                - Ensure ideas are actionable and trendy for 2024-2025.
            `,
        });

        const cleanedText = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        
        const result = IdeaSetSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }

        console.error("[Discovery] Zod validation failed for ideas:", result.error);
        throw new Error("Invalid ideation format from AI");

    } catch (error) {
        console.error("[Discovery] Ideation failed:", error);
        // Fallback data structure
        return {
            ideas: [{ id: "fallback", title: `Trending ${topic} Content`, description: "A high-energy video focusing on the core value of this niche.", complexity: "moderate" }],
            hooks: ["Wait for the end to see the results!", "You won't believe how simple this is."],
            patterns: ["The Problem / Solution", "The Expert Reveal"],
            formats: ["Talking Head", "Text Overlay Style"]
        };
    }
}

/**
 * Generates a full video script based on a chosen idea.
 */
export async function generateScriptFromIdea(idea: Idea, topic: string): Promise<Concept> {
    try {
        const { text } = await generateText({
            model: openai("gpt-4o"),
            prompt: `
                Create a high-conversion social media content brief and script based on this selected idea:
                
                Idea Title: ${idea.title}
                Description: ${idea.description}
                Niche: ${topic}
                
                Important: Return ONLY a JSON object with this structure:
                {
                    "concept": "Detailed creative angle",
                    "hook": "Specific viral hook text",
                    "targetAudience": "Who this is for and why",
                    "suggestedScript": "Script (Hook -> Value -> CTA)"
                }
            `,
        });

        const cleanedText = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        
        const result = ConceptSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }

        throw new Error("Invalid concept format from AI");

    } catch (error) {
        console.error("[Discovery] Script generation failed:", error);
        return {
            concept: idea.title,
            hook: "Stop scrolling!",
            targetAudience: `People interested in ${topic}`,
            suggestedScript: `${idea.description}. Follow for more!`
        };
    }
}
