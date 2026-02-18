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
    userId?: string
): Promise<RefinedScript> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured on the server.");
    }

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
                    topProjects.map((p: any) => JSON.stringify(p.script, null, 2)).join("\n---\n");
            }
        } catch (err) {
            console.error("AI Learning Loop: Failed to fetch examples", err);
        }
    }

    const stylePrompt = style ? `Video Style: ${style}` : "Video Style: Engaging and professional social media content";
    const tonePrompt = tone ? `Tone: ${tone}` : "Tone: Authentic and relatable";

    const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: "You are a professional social media scriptwriter. Your goal is to turn rough ideas into structured video scripts. " +
            "You should learn from the provided successful examples if available.",
        prompt: `Translate this rough social media video idea into a structured JSON script for a 15-second vertical video.
      
      Rough Idea: "${roughIdea}"
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
            "visual_direction": "string"
          }
        ],
        "cta": "string"
      }`,
    });

    try {
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse AI response:", text);
        throw new Error("The AI returned an invalid script format. Please try again.");
    }
}

export async function generateWanVideo(imageUrl: string, prompt: string) {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
        throw new Error("DASHSCOPE_API_KEY is not configured on the server.");
    }

    const response = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable"
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
        status: data.output.task_status,
        videoUrl: data.output.video_url,
        message: data.output.message
    };
}
