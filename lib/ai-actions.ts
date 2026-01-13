"use client";

// This file would normally be a server action, but for this demo/test phase, 
// we will simulate the refinement engine with a client-side mock if API keys are missing.
// However, the USER asked to use the Vercel AI SDK.

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

export async function refineIdea(roughIdea: string): Promise<RefinedScript> {
    // In a real app, this would be a server action 'use server'
    // and would use process.env.OPENAI_API_KEY

    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY is missing. Returning mock data.");
        return mockRefinedScript(roughIdea);
    }

    try {
        const { text } = await generateText({
            model: openai("gpt-4o"),
            prompt: `Translate this rough social media video idea into a structured JSON script for a 15-second vertical video.
      
      Rough Idea: "${roughIdea}"
      
      Response Format: JSON strictly following this schema:
      {
        "video_style": "string",
        "tone": "string",
        "scenes": [
          {
            "scene_id": number,
            "role": "hook" | "body" | "cta",
            "duration_seconds": number,
            "script": "string",
            "visual_direction": "string"
          }
        ],
        "cta": "string"
      }`,
        });

        return JSON.parse(text);
    } catch (error) {
        console.error("Refinement failed:", error);
        return mockRefinedScript(roughIdea);
    }
}

function mockRefinedScript(roughIdea: string): RefinedScript {
    return {
        video_style: "High-energy UGC",
        tone: "Excited and professional",
        scenes: [
            {
                scene_id: 1,
                role: "hook",
                duration_seconds: 3,
                script: `Stop scrolling! Did you know you could ${roughIdea}?`,
                visual_direction: "Medium shot, talking directly to camera, bright background"
            },
            {
                scene_id: 2,
                role: "body",
                duration_seconds: 7,
                script: "Most people struggle with this, but it's simpler than you think.",
                visual_direction: "B-roll of someone working efficiently on a laptop"
            },
            {
                scene_id: 3,
                role: "cta",
                duration_seconds: 5,
                script: "Check out Beyond to see the magic happen.",
                visual_direction: "Screen recording of the Beyond dashboard"
            }
        ],
        cta: "Link in bio to try Beyond"
    };
}
