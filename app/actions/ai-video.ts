"use server";

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

/**
 * Stage 1: Refine a rough idea into a structured video script using GPT-4o-mini
 */
export async function refineVideoIdea(roughIdea: string): Promise<RefinedScript> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured on the server.");
    }

    const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: "You are a professional social media scriptwriter. Your goal is to turn rough ideas into structured video scripts.",
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

    try {
        // Strip out any markdown formatting if GPT returns it
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse AI response:", text);
        throw new Error("The AI returned an invalid script format. Please try again.");
    }
}

/**
 * Stage 2: Trigger Wan AI 2.1 (Alibaba DashScope) Image-to-Video Generation
 */
export async function generateWanVideo(imageUrl: string, prompt: string) {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
        throw new Error("DASHSCOPE_API_KEY is not configured on the server.");
    }

    // For International/Singapore region: https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis
    const response = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable" // Enable asynchronous processing
        },
        body: JSON.stringify({
            model: "wan2.6-i2v",
            input: {
                img_url: imageUrl,
                prompt: prompt
            },
            parameters: {
                size: "1280*720",
                duration: 15,
                resolution: "720P",
                prompt_extend: true,
                shot_type: "multi"
            }
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Wan AI Submission Error:", data);
        throw new Error(data.message || "Failed to submit video generation task to Wan AI.");
    }

    return {
        taskId: data.output.task_id,
        status: data.output.task_status
    };
}

/**
 * Stage 3: Poll for video generation task status
 */
export async function getWanVideoStatus(taskId: string) {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
        throw new Error("DASHSCOPE_API_KEY is not configured.");
    }

    const response = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: {
            "Authorization": `Bearer ${apiKey}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to check task status.");
    }

    return {
        status: data.output.task_status, // PENDING, RUNNING, SUCCEEDED, FAILED
        videoUrl: data.output.video_url,
        message: data.output.message
    };
}
