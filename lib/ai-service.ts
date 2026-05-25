import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export interface RefinedScript {
    video_style: string;
    tone: string;
    scenes: {
        scene_id: number;
        role: string;
        duration_seconds: number;
        script: string;
        visual_direction: string;
    }[];
    cta: string;
}

import { Project } from "@/models/Project";
import connectDB from "@/lib/db";

export async function refineVideoIdea(
    roughIdea: string,
    style?: string,
    tone?: string,
    userId?: string,
    industry?: string,
    realEstateMode?: boolean,
    suggestedScript?: string
): Promise<RefinedScript> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured on the server.");
    }

    // Specialized Logic for Real Estate agents
    let agentContext = "";
    if (realEstateMode) {
        agentContext = "This is a Real Estate property tour. " +
            "The script should include natural insertion points for an AI agent avatar to talk and showcase the home. " +
            "The scenes should alternate between beautiful property shots and segments where an agent addresses the viewer.";
    }

    const industryPrompt = industry ? `Industry: ${industry}` : "";

    // Fetch successful examples for the learning loop
    let successfulExamplesPrompt = "";
    if (userId) {
        try {
            await connectDB();
            const topProjects = await Project.find({
                userId,
                socialStatus: "posted",
                performanceScore: { $gte: 70 }
            })
                .sort({ performanceScore: -1 })
                .limit(2)
                .lean();

            if (topProjects.length > 0) {
                successfulExamplesPrompt = "\nHere are some of your past high-performing scripts for reference:\n" +
                    topProjects.map((p) => JSON.stringify(p.script, null, 2)).join("\n---\n");
            }
        } catch (err) {
            console.error("AI Learning Loop: Failed to fetch examples", err);
        }
    }

    const stylePrompt = style ? `Video Style: ${style}` : "Video Style: Engaging and professional social media content";
    const tonePrompt = tone ? `Tone: ${tone}` : "Tone: Authentic and relatable";

    const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: "You are a professional social media scriptwriter and video director. Your goal is to turn rough ideas into structured, high-conversion video scripts with precise visual direction optimised for Kling 2.5 Turbo Pro image-to-video generation.\n\n" +
            "CRITICAL: For each scene, you must generate a `visual_direction` string that follows this exact Kling 2.5 Turbo Pro format:\n" +
            "[Camera movement]. [Subject description]. [Lighting]. [Mood]. Photorealistic. No text overlays. 9:16 vertical frame.\n\n" +
            "USE THESE KEYWORDS FOR HIGH-QUALITY KLING RESULTS:\n" +
            "- Camera movements: 'Slow push-in', 'Cinematic tracking shot', 'Gentle handheld', 'Smooth dolly in', 'Low angle rise', 'Orbital pan'.\n" +
            "- Lighting: 'Golden hour sunlight', 'Neon urban lighting', 'Soft diffused studio lighting', 'Moody rim lighting', 'High-contrast cinematic lighting'.\n" +
            "- Mood/Style: 'Photorealistic', 'Cinematic', 'Minimalist', 'Vibrant', 'Documentary', 'Hyperrealistic'.\n\n" +
            "EXAMPLE VISUAL DIRECTION:\n" +
            "'Slow push-in. Red luxury car parked on a rain-slicked Tokyo street at night, neon reflections in puddles. Moody rim lighting with blue and purple tones. Cinematic mood. Photorealistic. No text overlays. 9:16 vertical frame.'\n\n" +
            "You should learn from the provided successful examples if available. " + agentContext,
        prompt: `Translate this rough social media video idea into a structured JSON script for a 15-second vertical video.
      
      Rough Idea: "${roughIdea}"
      ${suggestedScript ? `Suggested Script Structure from Viral Reference: ${suggestedScript}` : ""}
      ${industryPrompt}
      ${stylePrompt}
      ${tonePrompt}
      ${successfulExamplesPrompt}
      
      Response Format: JSON strictly following this schema:
      {
        "video_style": "string (use provided style or suggest one)",
        "tone": "string (use provided tone or suggest one)",
        "scenes": [
          {
            "scene_id": number,
            "role": "hook" | "body" | "cta",
            "duration_seconds": number,
            "script": "string",
            "visual_direction": "string (following the formula: [Shot Type] + [Subject] + [Action] + [Setting] + [Lighting] + [Style] + [Technical])"
          }
        ],
        "cta": "string"
      }`,
    });

    try {
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);
    } catch {
        console.error("Failed to parse AI response:", text);
        throw new Error("The AI returned an invalid script format. Please try again.");
    }
}

// Wan 2.6 Flash removed — video generation now handled by the Inngest orchestrator
// in lib/inngest/generate-premium-video.ts using Creatify Aurora + Kling 2.5 via fal.ai

/**
 * Generates per-image Kling 2.5 Turbo Pro prompts for a set of images and a script.
 * Used internally by lib/scene-planner.ts.
 */
export async function generateScenePrompts(params: {
    imageUrls: string[];
    scenes: RefinedScript["scenes"];
    style: string;
    tone: string;
    industry: string;
}): Promise<string[]> {
    const { imageUrls, scenes, style, tone, industry } = params;
    const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: "You are a Kling 2.5 Turbo Pro video director. Write one concise prompt per image following this format: '[Camera movement]. [Subject]. [Lighting]. [Mood]. Photorealistic. No text overlays. 9:16 vertical frame.'",
        prompt: `Write ${imageUrls.length} Kling 2.5 prompts for these scenes. Industry: ${industry}. Style: ${style}. Tone: ${tone}.\n\nScenes:\n${scenes.map((s, i) => `${i + 1}. [${s.role}] ${s.visual_direction}`).join("\n")}\n\nReturn ONLY a JSON array of ${imageUrls.length} prompt strings.`,
    });
    try {
        const cleaned = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned) as string[];
    } catch {
        return imageUrls.map((_, i) => `${style} shot. ${scenes[i % scenes.length]?.visual_direction ?? "Cinematic scene"}. ${tone} mood. Photorealistic. No text overlays. 9:16 vertical frame.`);
    }
}
