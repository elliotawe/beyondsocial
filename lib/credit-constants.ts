export const CREDIT_COSTS = {
    discovery: { amount: 1, label: "Content Discovery", reason: "Content discovery — AI-generated trending ideas for your niche" },
    concept: { amount: 1, label: "Concept Generation", reason: "Concept generation — converting your selected idea into a full production script" },
    script_refine: { amount: 1, label: "Script Refinement", reason: "Script refinement — AI-optimized scenes, hooks, and visual directions" },
    captions: { amount: 1, label: "Caption & Hashtag Generation", reason: "Caption & hashtag generation — platform-optimised copy for maximum reach" },
    video_generation: { amount: 3, label: "Video Generation", reason: "Video generation — Wan AI 2.6 Flash rendering engine" },
} as const;

export const PLAN_MONTHLY_CREDITS: Record<string, number> = {
    free: 15,
    pro: 60,
    business: 200,
};
