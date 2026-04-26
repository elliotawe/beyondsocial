import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PHASE_1_SYSTEM = `You are a viral content strategist. The user gives you a rough video idea.
Your job is to:
1. Identify the core topic, target audience, and content angle in one sentence each.
2. Ask exactly 2-3 short, specific clarifying questions to sharpen the idea.
   Questions should cover: hook style (emotional hook, curiosity, shock, etc), video length preference (15s / 30s / 60s), and platform tone (TikTok raw & relatable, Instagram polished, YouTube educational).

Respond ONLY with valid JSON matching this exact shape:
{
  "topic": "...",
  "audience": "...",
  "angle": "...",
  "questions": [
    { "id": "q1", "label": "Hook Style", "question": "...", "options": ["Option A", "Option B", "Option C"] },
    { "id": "q2", "label": "Video Length", "question": "...", "options": ["15s", "30s", "60s"] },
    { "id": "q3", "label": "Platform Tone", "question": "...", "options": ["Raw & Relatable", "Polished & Premium", "Educational & Clear"] }
  ]
}`;

const PHASE_2_SYSTEM = `You are a viral content strategist. Given a rough idea and the user's answers to clarifying questions, produce a polished content brief.

Respond ONLY with valid JSON matching this exact shape:
{
  "hook": "...",
  "scriptOutline": [
    { "part": "Hook (0-3s)", "description": "..." },
    { "part": "Value Drop (3-10s)", "description": "..." },
    { "part": "Punchline / Reveal (10-20s)", "description": "..." },
    { "part": "CTA (last 3s)", "description": "..." }
  ],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "videoLength": "30s",
  "titleVariations": ["Title 1", "Title 2", "Title 3"],
  "industry": "...",
  "concept": "...",
  "suggestedSearch": "..."
}`;

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { idea?: string; phase?: number; answers?: Record<string, string> };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { idea, phase = 1, answers } = body;
    if (!idea?.trim()) {
        return NextResponse.json({ error: "idea is required" }, { status: 400 });
    }

    try {
        if (phase === 1) {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: PHASE_1_SYSTEM },
                    { role: "user", content: `My video idea: "${idea}"` },
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 600,
            });
            const parsed = JSON.parse(completion.choices[0].message.content || "{}");
            return NextResponse.json({ success: true, ...parsed });
        }

        if (phase === 2) {
            const answersText = answers
                ? Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join("\n")
                : "No answers provided";

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: PHASE_2_SYSTEM },
                    {
                        role: "user",
                        content: `Original idea: "${idea}"\n\nUser's answers:\n${answersText}\n\nGenerate the content brief.`,
                    },
                ],
                response_format: { type: "json_object" },
                temperature: 0.8,
                max_tokens: 900,
            });
            const parsed = JSON.parse(completion.choices[0].message.content || "{}");
            return NextResponse.json({ success: true, ...parsed });
        }

        return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    } catch (err) {
        console.error("[refine-idea]", err);
        return NextResponse.json({ error: "Failed to process idea. Please try again." }, { status: 500 });
    }
}
