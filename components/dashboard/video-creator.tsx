"use client"

import type { RefinedScript } from "@/lib/ai-service";
import { cn } from "@/lib/utils";
import {
    AlertCircle, ArrowRight, Bell, Check, Loader2, Play, Sparkles,
    Save, Plus, X, Share2, Download, Scissors, Type, Zap, Mic, Camera,
    Clock, ChevronRight, User, Package, Building2
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import NextImage from "next/image";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { DiscoveryStep } from "./discovery-step";
import { VideoEditor } from "./video-editor";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getMediaMetadata = (file: File): Promise<{ width: number; height: number; type: "image" | "video" }> => {
    return new Promise((resolve, reject) => {
        if (file.type.startsWith("video/")) {
            resolve({ width: 0, height: 0, type: "video" });
            return;
        }
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: img.width, height: img.height, type: "image" });
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Could not load image: ${file.name}`));
        };
        img.src = objectUrl;
    });
};

// ─── Option data ──────────────────────────────────────────────────────────────

const STYLE_OPTIONS = [
    { value: "cinematic",    label: "Cinematic" },
    { value: "vlog",         label: "Vlog" },
    { value: "luxury",       label: "Luxury" },
    { value: "minimalist",   label: "Minimal" },
    { value: "vibrant",      label: "Vibrant" },
    { value: "documentary",  label: "Documentary" },
    { value: "futuristic",   label: "Futuristic" },
];

const TONE_OPTIONS = [
    { value: "professional", label: "Professional" },
    { value: "humorous",     label: "Witty" },
    { value: "inspiring",    label: "Inspiring" },
    { value: "urgency",      label: "Urgent" },
    { value: "relatable",    label: "Relatable" },
    { value: "hype",         label: "Hype" },
    { value: "calm",         label: "Calm" },
];

const ROLE_COLORS: Record<string, { bar: string; dot: string; label: string }> = {
    hook:  { bar: "bg-amber-400",  dot: "bg-amber-400",  label: "Hook" },
    intro: { bar: "bg-amber-400",  dot: "bg-amber-400",  label: "Intro" },
    body:  { bar: "bg-blue-400",   dot: "bg-blue-400",   label: "Body" },
    value: { bar: "bg-blue-400",   dot: "bg-blue-400",   label: "Value" },
    cta:   { bar: "bg-primary",    dot: "bg-primary",    label: "CTA" },
    outro: { bar: "bg-primary",    dot: "bg-primary",    label: "Outro" },
};

function getRoleStyle(role: string) {
    return ROLE_COLORS[role?.toLowerCase()] ?? { bar: "bg-muted-foreground/30", dot: "bg-muted-foreground/30", label: role || "Scene" };
}

// ─── Step ribbon ──────────────────────────────────────────────────────────────

const STEPS = ["Brief", "Script", "Generate", "Done"] as const;

function StepRibbon({ currentStep }: { currentStep: number }) {
    if (currentStep === 0) return null;
    return (
        <div className="flex items-center mb-10">
            {STEPS.map((label, i) => {
                const stepNum = i + 1;
                const isActive = currentStep === stepNum;
                const isDone   = currentStep > stepNum;
                return (
                    <div key={label} className="flex items-center">
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "size-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all duration-300",
                                isDone
                                    ? "bg-primary text-primary-foreground"
                                    : isActive
                                    ? "bg-primary/15 text-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
                                    : "bg-muted/30 text-muted-foreground/25"
                            )}>
                                {isDone ? <Check className="size-3.5" aria-hidden="true" /> : String(stepNum)}
                            </div>
                            <span className={cn(
                                "text-[11px] font-bold tracking-wider uppercase transition-colors duration-300 hidden sm:block",
                                isActive ? "text-foreground" : isDone ? "text-muted-foreground/40" : "text-muted-foreground/20"
                            )}>
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={cn(
                                "h-px w-8 mx-4 transition-all duration-500",
                                isDone ? "bg-primary/40" : "bg-border/30"
                            )} aria-hidden="true" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Chip selector ────────────────────────────────────────────────────────────

function ChipSelector({ options, value, onChange }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5" role="group">
            {options.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    aria-pressed={value === opt.value}
                    className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        value === opt.value
                            ? "bg-foreground text-background border-transparent shadow-sm"
                            : "bg-transparent border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ─── Credit badge ─────────────────────────────────────────────────────────────

function CreditBadge({ amount }: { amount: number }) {
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full ml-1.5">
            <Zap className="w-2.5 h-2.5" aria-hidden="true" />
            {amount} credit{amount !== 1 ? "s" : ""}
        </span>
    );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <motion.div
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm"
        >
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
            <p className="flex-1 text-destructive/90 leading-snug">{message}</p>
            <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss error"
                className="text-destructive/50 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 rounded"
            >
                <X className="size-3.5" />
            </button>
        </motion.div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PANEL_VARIANTS = {
    enter:  { opacity: 0, y: 14 },
    center: { opacity: 1, y: 0  },
    exit:   { opacity: 0, y: -8 },
};

const PANEL_VARIANTS_REDUCED = {
    enter:  { opacity: 0 },
    center: { opacity: 1 },
    exit:   { opacity: 0 },
};

export function VideoCreator() {
    const shouldReduceMotion = useReducedMotion();
    const panelVariants = shouldReduceMotion ? PANEL_VARIANTS_REDUCED : PANEL_VARIANTS;

    const [step, setStep]                     = useState(0);
    const [roughIdea, setRoughIdea]           = useState("");
    const [style, setStyle]                   = useState("cinematic");
    const [tone, setTone]                     = useState("professional");
    const [isRefining, setIsRefining]         = useState(false);
    const [isSaving, setIsSaving]             = useState(false);
    const [refinedScript, setRefinedScript]   = useState<RefinedScript | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading]       = useState(false);
    const [isGenerating, setIsGenerating]     = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [projectId, setProjectId]           = useState<string | null>(null);
    const [error, setError]                   = useState<string | null>(null);
    const [showEditor, setShowEditor]         = useState(false);
    const [autoCaptions, setAutoCaptions]     = useState<string[]>([]);
    const [recommendedHashtags, setRecommendedHashtags] = useState<string[]>([]);
    const [isFetchingCaptions, setIsFetchingCaptions]   = useState(false);
    const [useClonedVoice, setUseClonedVoice]           = useState(false);
    const [hasClonedVoice, setHasClonedVoice]           = useState(false);
    const [realEstateMode, setRealEstateMode]           = useState(false);
    const [selectedIndustry, setSelectedIndustry]       = useState<string | null>(null);
    const [suggestedScript, setSuggestedScript]         = useState<string | undefined>(undefined);
    const [videoType, setVideoType]                     = useState<"person" | "product" | "property" | null>(null);
    const [portraitImageUrl, setPortraitImageUrl]       = useState<string | null>(null);
    const [isUploadingPortrait, setIsUploadingPortrait] = useState(false);
    const [renderProgress, setRenderProgress] = useState<{
        totalClips: number; completedClips: number; currentStage: string;
        clips?: { type: "avatar" | "broll"; label: string; status: string; queuePosition?: number }[];
    }>({ totalClips: 0, completedClips: 0, currentStage: "Getting your project ready…" });

    // Check if the user has a cloned voice saved
    useEffect(() => {
        fetch("/api/user/voice")
            .then((r) => r.json())
            .then((data: { clonedVoiceUrl?: string | null }) => {
                setHasClonedVoice(!!data.clonedVoiceUrl);
            })
            .catch(() => {});
    }, []);

    // ─── Handlers ────────────────────────────────────────────────────────────

    const handleSelectBrief = ({ industry, concept, hook, idea, suggestedScript: ds }: {
        industry: string; concept: string; hook: string; idea: string; suggestedScript?: string;
    }) => {
        setSelectedIndustry(industry);
        setRealEstateMode(industry.toLowerCase().includes("real estate") || industry.toLowerCase().includes("property"));
        setRoughIdea(`Concept: ${concept}\nHook: ${hook}\nContext: ${idea}`);
        setSuggestedScript(ds);
        setVideoType(null);
        setPortraitImageUrl(null);
        setUploadedImages([]);
        setStep(1);
    };

    const handleRefine = async () => {
        if (!roughIdea.trim()) return;
        setIsRefining(true);
        setError(null);
        try {
            const draftRes = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: roughIdea.slice(0, 30) + "...",
                    roughIdea, style, tone, useClonedVoice,
                    industry: selectedIndustry || undefined,
                    uploadedImages,
                    videoType: videoType || "person",
                    ...(portraitImageUrl ? { portraitImageUrl } : {}),
                }),
            });
            const draftResult = await draftRes.json();
            if (!draftRes.ok) throw new Error(draftResult.error || "Failed to create draft");
            const newProjectId = draftResult.projectId;
            setProjectId(newProjectId);

            const refineRes = await fetch("/api/ai-video/refine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idea: roughIdea, style, tone, industry: selectedIndustry || undefined, realEstateMode, suggestedScript }),
            });
            const refineResult = await refineRes.json();
            if (!refineRes.ok) throw new Error(refineResult.error || "Failed to refine idea");
            if (refineResult.creditsRemaining !== undefined) {
                toast.success(`Script refined — ${refineResult.creditsRemaining} credits remaining`);
            }
            setRefinedScript(refineResult.refined);

            await fetch(`/api/projects/${newProjectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ script: refineResult.refined }),
            });
            setStep(2);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!projectId || !refinedScript) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ script: refinedScript, uploadedImages }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
            toast.success("Draft saved.");
        } catch (e: unknown) {
            setError((e as Error).message || "Failed to save draft.");
        } finally {
            setIsSaving(false);
        }
    };

    const updateScene = (index: number, field: "script" | "visual_direction", value: string) => {
        if (!refinedScript) return;
        const scenes = [...refinedScript.scenes];
        scenes[index] = { ...scenes[index], [field]: value };
        setRefinedScript({ ...refinedScript, scenes });
    };

    const updateCTA = (value: string) => {
        if (!refinedScript) return;
        setRefinedScript({ ...refinedScript, cta: value });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesSelected = e.target.files;
        if (!filesSelected?.length) return;
        const files = Array.from(filesSelected);
        setIsUploading(true);
        setError(null);
        try {
            const urls = await Promise.all(files.map(async (file) => {
                const isVideo = file.type.startsWith("video/");
                const maxSize = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
                if (file.size > maxSize) throw new Error(`"${file.name}" is too large. Max: ${isVideo ? "15MB" : "5MB"}.`);
                if (!isVideo) {
                    const { width, height } = await getMediaMetadata(file);
                    if (width < 240 || height < 240 || width > 7680 || height > 7680) {
                        throw new Error(`"${file.name}" dimensions (${width}×${height}) are out of range.`);
                    }
                }
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = () => reject(new Error(`Failed to read "${file.name}"`));
                    reader.onload = async (ev) => {
                        if (!ev.target?.result) {
                            reject(new Error(`Failed to read "${file.name}"`));
                            return;
                        }
                        try {
                            const res = await fetch("/api/upload/image", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ file: ev.target.result, projectId: projectId || undefined }),
                            });
                            const data = await res.json() as { success: boolean; url: string; error?: string };
                            if (!res.ok) throw new Error(data.error || "Upload failed");
                            resolve(data.url);
                        } catch (err) {
                            reject(err instanceof Error ? err : new Error(`Upload failed for "${file.name}"`));
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }));
            setUploadedImages(prev => [...prev, ...urls]);
        } catch (e: unknown) {
            setError((e as Error).message || "An error occurred during upload.");
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    const removeImage = (index: number) => setUploadedImages(prev => prev.filter((_, i) => i !== index));

    const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingPortrait(true);
        setError(null);
        try {
            if (file.size > 5 * 1024 * 1024) throw new Error(`"${file.name}" is too large. Max 5MB.`);
            const { width, height } = await getMediaMetadata(file);
            if (width < 240 || height < 240) throw new Error(`"${file.name}" is too small. Minimum 240×240px.`);
            const url = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error("Failed to read portrait image"));
                reader.onload = async (ev) => {
                    if (!ev.target?.result) {
                        reject(new Error("Failed to read portrait image"));
                        return;
                    }
                    try {
                        const res = await fetch("/api/upload/image", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ file: ev.target.result, projectId: projectId || undefined, role: "portrait" }),
                        });
                        const data = await res.json() as { success: boolean; url: string; error?: string };
                        if (!res.ok) throw new Error(data.error || "Upload failed");
                        resolve(data.url);
                    } catch (err) { reject(err instanceof Error ? err : new Error("Upload failed")); }
                };
                reader.readAsDataURL(file);
            });
            setPortraitImageUrl(url);
        } catch (e: unknown) {
            setError((e as Error).message || "Portrait upload failed.");
        } finally {
            setIsUploadingPortrait(false);
            e.target.value = "";
        }
    };

    const handleGenerate = async () => {
        const needsPortrait = videoType === "person" || videoType === null;
        if (needsPortrait && !portraitImageUrl && !uploadedImages.length) return;
        if (!needsPortrait && !uploadedImages.length) return;
        if (!refinedScript || !projectId) return;
        setError(null);
        setIsGenerating(true);
        try {
            const patchRes = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    script: refinedScript,
                    uploadedImages,
                    videoType: videoType || "person",
                    ...(portraitImageUrl ? { portraitImageUrl } : {}),
                }),
            });
            if (!patchRes.ok) {
                const patchErr = await patchRes.json().catch(() => ({}));
                throw new Error((patchErr as { error?: string }).error || "Failed to save project before generating.");
            }
            const prompt = `Style: ${refinedScript.video_style}. Tone: ${refinedScript.tone}. ${refinedScript.scenes.map(s => s.visual_direction).join(". ")}`;
            const genRes = await fetch("/api/ai-video/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: portraitImageUrl || uploadedImages[0],
                    prompt,
                    scriptData: { ...refinedScript, roughIdea, projectId, uploadedImages, videoType: videoType || "person" },
                }),
            });
            const genResult = await genRes.json();
            if (!genRes.ok) throw new Error(genResult.error || "Generation failed");
            if (genResult.creditsRemaining !== undefined) {
                toast.success(`Generating — ${genResult.creditsRemaining} credits remaining`);
            }
            setStep(3);
            pollStatus(genResult.projectId);
        } catch (e: unknown) {
            setError((e as Error).message || "Failed to start generation.");
            setIsGenerating(false);
        }
    };

    const fetchCaptionsAndHashtags = async (script: RefinedScript) => {
        setIsFetchingCaptions(true);
        try {
            const res = await fetch("/api/ai-video/captions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ script, industry: selectedIndustry || undefined, platforms: ["TikTok", "Instagram", "LinkedIn"] }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAutoCaptions(data.captions || []);
                setRecommendedHashtags(data.hashtags || []);
            } else {
                setAutoCaptions([script.scenes[0]?.script || "Welcome to Beyond.", script.cta || "Start creating today!"]);
                setRecommendedHashtags([`#${(selectedIndustry || "content").toLowerCase().replace(/\s+/g, "")}`, "#beyondsocial", "#aivirals", "#contentcreator"]);
            }
        } catch {
            setAutoCaptions([script.scenes[0]?.script || "Beyond Social.", script.cta || "Create more."]);
        } finally {
            setIsFetchingCaptions(false);
        }
    };

    const pollStatus = (id: string) => {
        const es = new EventSource(`/api/ai-video/stream/${id}`);

        es.addEventListener("progress", (e) => {
            try {
                const result = JSON.parse(e.data);
                if (result.progress) {
                    setRenderProgress({
                        totalClips: result.progress.totalClips ?? 0,
                        completedClips: result.progress.completedClips ?? 0,
                        currentStage: result.progress.currentStage ?? "Processing…",
                        clips: result.progress.clips ?? [],
                    });
                }
                if (result.status === "completed" && result.videoUrl) {
                    es.close();
                    setGeneratedVideo(result.videoUrl);
                    setIsGenerating(false);
                    setStep(4);
                    if (result.script) fetchCaptionsAndHashtags(result.script);
                } else if (result.status === "failed") {
                    es.close();
                    setError("Something went wrong generating your video. Your 3 credits have been refunded automatically.");
                    setIsGenerating(false);
                }
            } catch {
                // malformed event — ignore
            }
        });

        es.addEventListener("error", (e) => {
            es.close();
            setIsGenerating(false);
            try {
                const msg = (e as MessageEvent).data
                    ? (JSON.parse((e as MessageEvent).data) as { message?: string })?.message
                    : null;
                setError(msg || "Connection lost. Please refresh and check your projects.");
            } catch {
                setError("Connection lost. Please refresh and check your projects.");
            }
        });
    };

    const resetCreator = () => {
        setStep(0); setRoughIdea(""); setStyle("cinematic"); setTone("professional");
        setRefinedScript(null); setUploadedImages([]); setGeneratedVideo(null);
        setProjectId(null); setSelectedIndustry(null); setAutoCaptions([]);
        setRecommendedHashtags([]); setError(null); setVideoType(null);
        setPortraitImageUrl(null);
        setRenderProgress({ totalClips: 0, completedClips: 0, currentStage: "Getting your project ready…", clips: [] });
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    const progressPct = renderProgress.totalClips > 0
        ? Math.round((renderProgress.completedClips / renderProgress.totalClips) * 100)
        : 0;

    return (
        <div className="w-full px-4 py-8">
            <AnimatePresence mode="wait">

                {/* ── Discovery (step 0) ── */}
                {step === 0 && (
                    <motion.div key="discovery" variants={panelVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                        <DiscoveryStep onSelectBrief={handleSelectBrief} />
                    </motion.div>
                )}

                {/* ── Step 1: Brief ── */}
                {step === 1 && (
                    <motion.div key="brief" variants={panelVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                        <StepRibbon currentStep={1} />
                        <div className="space-y-8 max-w-2xl">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight ">Set the scene.</h1>
                                <p className="text-muted-foreground text-sm mt-1.5">Choose your video type, upload photos, then set your style.</p>
                            </div>

                            <AnimatePresence>
                                {error && <ErrorBanner key="err" message={error} onDismiss={() => setError(null)} />}
                            </AnimatePresence>

                            {/* ── Video type selector ── */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Video Type</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {([
                                        { type: "person" as const,   icon: User,      title: "Person-led",      desc: "AI talking head + b-roll" },
                                        { type: "product" as const,  icon: Package,   title: "Product / Brand", desc: "Product visuals + voiceover" },
                                        { type: "property" as const, icon: Building2, title: "Property Tour",   desc: "Location visuals + voiceover" },
                                    ]).map(({ type, icon: Icon, title, desc }) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => { setVideoType(type); if (type !== "person") setPortraitImageUrl(null); }}
                                            aria-pressed={videoType === type}
                                            className={cn(
                                                "relative rounded-2xl border-2 p-4 text-left transition-all duration-200 overflow-hidden",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                                                videoType === type
                                                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                                                    : "border-border/40 bg-card/40 hover:border-border/70 hover:bg-card/70 hover:shadow-sm hover:-translate-y-0.5"
                                            )}
                                        >
                                            {/* Check badge */}
                                            <AnimatePresence>
                                                {videoType === type && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.5 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.5 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute top-2.5 right-2.5 size-5 rounded-full bg-primary flex items-center justify-center shadow-sm"
                                                        aria-hidden="true"
                                                    >
                                                        <Check className="size-3 text-primary-foreground" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className={cn(
                                                "inline-flex items-center justify-center size-11 rounded-xl mb-3 transition-all duration-200",
                                                videoType === type
                                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                                    : "bg-muted/40 text-muted-foreground/50"
                                            )}>
                                                <Icon className="size-5" />
                                            </div>
                                            <p className="text-sm font-bold leading-tight pr-5">{title}</p>
                                            <p className="text-[11px] text-muted-foreground/60 leading-snug mt-1">{desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Image upload (conditional on type) ── */}
                            {videoType === "person" && (
                                <div className="space-y-6">
                                    {/* Section A: Headshot */}
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Headshot</label>
                                                <span className="text-[9px] font-bold text-primary/70 bg-primary/8 px-2 py-0.5 rounded-full border border-primary/20">Required for avatar</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground/50">Front-facing, good lighting, uncluttered background · JPG/PNG · 5MB max</p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            {portraitImageUrl ? (
                                                <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-primary/40 group shrink-0 shadow-lg shadow-primary/10">
                                                    <NextImage src={portraitImageUrl} alt="Your headshot" className="object-cover w-full h-full" width={112} height={112} unoptimized />
                                                    <button
                                                        type="button"
                                                        onClick={() => setPortraitImageUrl(null)}
                                                        aria-label="Remove headshot"
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center focus-visible:outline-none"
                                                    >
                                                        <X className="size-5 text-white" />
                                                    </button>
                                                    <div className="absolute bottom-2 right-2 size-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                                                        <Check className="size-3.5 text-primary-foreground" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className={cn(
                                                    "relative w-28 h-28 rounded-2xl border-2 border-dashed border-primary/25 flex flex-col items-center justify-center cursor-pointer shrink-0 transition-all duration-200 gap-1.5",
                                                    "hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/8",
                                                    isUploadingPortrait && "opacity-60 pointer-events-none"
                                                )}>
                                                    <input type="file" className="sr-only" onChange={handlePortraitUpload} disabled={isUploadingPortrait} accept="image/*" />
                                                    {isUploadingPortrait ? (
                                                        <Loader2 className="size-7 text-primary/40 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                <User className="size-6 text-primary/50" />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-primary/50 text-center leading-tight">Upload<br/>headshot</span>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                            {portraitImageUrl && (
                                                <div className="flex flex-col gap-1 pt-1">
                                                    <p className="text-xs font-bold text-foreground">Headshot uploaded</p>
                                                    <p className="text-[11px] text-muted-foreground/60">This will be used to generate your AI talking head avatar.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section B: B-roll images */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Content Images</label>
                                            <p className="text-[11px] text-muted-foreground/50 mt-1">Products, spaces, or lifestyle shots · Each becomes a b-roll scene · JPG/PNG · 5MB max</p>
                                        </div>
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            {uploadedImages.map((url, i) => (
                                                <div key={i} className="relative size-20 rounded-xl overflow-hidden border border-border/50 group shrink-0">
                                                    <NextImage src={url} alt={`Content image ${i + 1}`} className="object-cover w-full h-full" width={80} height={80} unoptimized={url.startsWith("data:")} />
                                                    <button type="button" onClick={() => removeImage(i)} aria-label={`Remove image ${i + 1}`} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center focus-visible:outline-none">
                                                        <X className="size-4 text-white" />
                                                    </button>
                                                </div>
                                            ))}
                                            <label className={cn(
                                                "relative size-20 rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center cursor-pointer shrink-0 transition-all duration-200 gap-1",
                                                "hover:border-primary/50 hover:bg-primary/5",
                                                isUploading && "opacity-60 pointer-events-none"
                                            )}>
                                                <input type="file" multiple className="sr-only" onChange={handleImageUpload} disabled={isUploading} accept="image/*" />
                                                {isUploading
                                                    ? <Loader2 className="size-5 text-muted-foreground animate-spin" />
                                                    : <><Plus className="size-4 text-muted-foreground/50" /><span className="text-[9px] font-bold text-muted-foreground/40">Add</span></>
                                                }
                                            </label>
                                        </div>
                                        {uploadedImages.length === 0 ? (
                                            <p className="text-[11px] text-muted-foreground/40">Optional — adds visual variety between your talking head clips</p>
                                        ) : (
                                            <p className="text-[11px] text-muted-foreground/50">{uploadedImages.length} image{uploadedImages.length !== 1 ? "s" : ""} — each becomes a scene</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(videoType === "product" || videoType === "property") && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {videoType === "property" ? "Property Photos" : "Product / Brand Images"}
                                        </label>
                                        <p className="text-[11px] text-muted-foreground/50 mt-1">
                                            {videoType === "property"
                                                ? "Interior and exterior shots · Each becomes a scene · JPG/PNG · 5MB max"
                                                : "Product shots, lifestyle photos · Each becomes a scene · JPG/PNG · 5MB max"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        {uploadedImages.map((url, i) => (
                                            <div key={i} className="relative size-20 rounded-xl overflow-hidden border border-border/50 group shrink-0">
                                                <NextImage src={url} alt={`Photo ${i + 1}`} className="object-cover w-full h-full" width={80} height={80} unoptimized={url.startsWith("data:")} />
                                                <button type="button" onClick={() => removeImage(i)} aria-label={`Remove photo ${i + 1}`} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center focus-visible:outline-none">
                                                    <X className="size-4 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className={cn(
                                            "relative size-20 rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center cursor-pointer shrink-0 transition-all duration-200 gap-1",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            isUploading && "opacity-60 pointer-events-none"
                                        )}>
                                            <input type="file" multiple className="sr-only" onChange={handleImageUpload} disabled={isUploading} accept="image/*" />
                                            {isUploading
                                                ? <Loader2 className="size-5 text-muted-foreground animate-spin" />
                                                : <><Plus className="size-4 text-muted-foreground/50" /><span className="text-[9px] font-bold text-muted-foreground/40">Add</span></>
                                            }
                                        </label>
                                        {uploadedImages.length === 0 && !isUploading && (
                                            <p className="text-xs text-muted-foreground/50 pl-1 self-center">Add at least one image to continue</p>
                                        )}
                                    </div>
                                    {uploadedImages.length > 0 && (
                                        <p className="text-[11px] text-muted-foreground/50">{uploadedImages.length} image{uploadedImages.length !== 1 ? "s" : ""} — all will be used as scenes</p>
                                    )}
                                </div>
                            )}

                            {!videoType && (
                                <div className="rounded-2xl border border-dashed border-border/25 bg-muted/8 p-6 text-center">
                                    <p className="text-sm text-muted-foreground/40">Select a video type above to see upload options</p>
                                </div>
                            )}

                            {/* ── Style chips ── */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Style</label>
                                <ChipSelector options={STYLE_OPTIONS} value={style} onChange={setStyle} />
                            </div>

                            {/* ── Tone chips ── */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tone</label>
                                <ChipSelector options={TONE_OPTIONS} value={tone} onChange={setTone} />
                            </div>

                            {/* ── Voice toggle ── */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Voice</label>
                                <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Voice selection">
                                    {[
                                        { label: "Standard AI", cloned: false },
                                        { label: "Cloned", cloned: true },
                                    ].map(({ label, cloned }) => {
                                        const disabled = cloned && !hasClonedVoice;
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => !disabled && setUseClonedVoice(cloned)}
                                                aria-pressed={useClonedVoice === cloned}
                                                className={cn(
                                                    "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 flex items-center gap-1.5",
                                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                                                    disabled
                                                        ? "opacity-40 cursor-not-allowed bg-transparent border-border/30 text-muted-foreground"
                                                        : useClonedVoice === cloned
                                                            ? "bg-foreground text-background border-transparent shadow-sm"
                                                            : "bg-transparent border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                                                )}
                                            >
                                                {cloned && hasClonedVoice && (
                                                    <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                                                )}
                                                {label}
                                            </button>
                                        );
                                    })}
                                    {!hasClonedVoice && (
                                        <a
                                            href="/dashboard/voice"
                                            className="text-[10px] text-primary underline underline-offset-2 hover:opacity-80"
                                        >
                                            Set up →
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* ── Idea textarea ── */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Idea</label>
                                <div className={cn(
                                    "rounded-2xl border bg-card/60 transition-colors duration-200",
                                    "border-border/60 focus-within:border-foreground/30"
                                )}>
                                    <Textarea
                                        rows={4}
                                        placeholder="Describe your concept, target audience, key message…"
                                        className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 resize-none font-medium text-sm p-4 leading-relaxed"
                                        value={roughIdea}
                                        onChange={(e) => setRoughIdea(e.target.value)}
                                    />
                                    <div className="px-4 pb-3 flex items-center justify-between border-t border-border/20 pt-3">
                                        <span className="text-[10px] text-muted-foreground/30 font-medium">Script refinement · 1 credit</span>
                                        <Button
                                            type="button"
                                            onClick={handleRefine}
                                            disabled={isRefining || !roughIdea.trim() || !videoType || (videoType === "person" ? !portraitImageUrl : uploadedImages.length === 0)}
                                            size="sm"
                                            className="h-8 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs font-bold px-4 disabled:opacity-30 transition-all duration-150"
                                        >
                                            {isRefining
                                                ? <><Loader2 className="size-3.5 animate-spin mr-1.5" aria-hidden="true" />Refining…</>
                                                : <><ArrowRight className="size-3.5 mr-1.5" aria-hidden="true" />Refine Script</>
                                            }
                                        </Button>
                                    </div>
                                </div>
                                {!videoType && roughIdea.trim() && (
                                    <p className="text-[11px] text-muted-foreground/50 pl-1">↑ Select a video type above to continue.</p>
                                )}
                                {videoType === "person" && !portraitImageUrl && roughIdea.trim() && (
                                    <p className="text-[11px] text-muted-foreground/50 pl-1">↑ Upload your headshot to continue.</p>
                                )}
                                {videoType !== "person" && videoType && uploadedImages.length === 0 && roughIdea.trim() && (
                                    <p className="text-[11px] text-muted-foreground/50 pl-1">↑ Upload at least one image to continue.</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── Step 2: Script ── */}
                {step === 2 && refinedScript && (
                    <motion.div key="script" variants={panelVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                        <StepRibbon currentStep={2} />
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight ">Review script.</h1>
                                    <p className="text-muted-foreground text-sm mt-1.5">
                                        {refinedScript.scenes.length} scenes · {refinedScript.scenes.reduce((a, s) => a + (s.duration_seconds || 0), 0)}s total
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} className="rounded-xl h-9 px-4 text-xs font-bold text-muted-foreground">
                                        Back
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving} className="rounded-xl h-9 px-4 text-xs font-bold border-border/60">
                                        {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Save className="size-3.5" aria-hidden="true" />}
                                        <span className="ml-1.5">Save</span>
                                    </Button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {error && <ErrorBanner key="err" message={error} onDismiss={() => setError(null)} />}
                            </AnimatePresence>

                            {/* Metadata strip */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">{refinedScript.video_style}</span>
                                <span className="text-muted-foreground/20 text-[10px]">·</span>
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">{refinedScript.tone}</span>
                                <span className="text-muted-foreground/20 text-[10px]">·</span>
                                <span className="text-[10px] font-bold text-muted-foreground/40">{uploadedImages.length} photo{uploadedImages.length !== 1 ? "s" : ""} queued</span>
                            </div>

                            {/* Scene cards */}
                            <div className="space-y-2.5">
                                {refinedScript.scenes.map((scene, idx) => {
                                    const role = getRoleStyle(scene.role);
                                    return (
                                        <div key={idx} className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden hover:border-border/60 hover:shadow-sm transition-all duration-200">
                                            {/* Role color accent stripe */}
                                            <div className={cn("h-0.5 w-full", role.bar)} aria-hidden="true" />

                                            {/* Scene label row */}
                                            <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={cn("size-2 rounded-full shrink-0", role.dot)} aria-hidden="true" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                        {String(idx + 1).padStart(2, "0")} · {role.label}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-muted-foreground/40 flex items-center gap-1">
                                                    <Clock className="size-3" aria-hidden="true" />{scene.duration_seconds}s
                                                </span>
                                            </div>

                                            {/* Voiceover */}
                                            <div className="px-5 pt-3.5 pb-2">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Mic className="size-3 text-muted-foreground/30" aria-hidden="true" />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Voiceover</span>
                                                </div>
                                                <Textarea
                                                    value={scene.script}
                                                    onChange={e => updateScene(idx, "script", e.target.value)}
                                                    aria-label={`Scene ${idx + 1} voiceover script`}
                                                    className="bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 px-0 py-0 text-sm font-medium leading-relaxed min-h-17.5 resize-none placeholder:text-muted-foreground/30"
                                                    placeholder="Voiceover text…"
                                                />
                                            </div>

                                            {/* Visual direction */}
                                            <div className="px-5 pb-4 pt-1 border-t border-border/15 bg-muted/5">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Camera className="size-3 text-muted-foreground/30" aria-hidden="true" />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Visual</span>
                                                </div>
                                                <Textarea
                                                    value={scene.visual_direction}
                                                    onChange={e => updateScene(idx, "visual_direction", e.target.value)}
                                                    aria-label={`Scene ${idx + 1} visual direction`}
                                                    className="bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 px-0 py-0 text-xs italic text-muted-foreground leading-relaxed min-h-12.5 resize-none placeholder:text-muted-foreground/30"
                                                    placeholder="What happens visually…"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* CTA card */}
                            <div className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden">
                                <div className="h-0.5 w-full bg-primary/50" aria-hidden="true" />
                                <div className="flex items-center gap-2 px-5 py-3 border-b border-border/20">
                                    <ChevronRight className="size-3.5 text-primary/60" aria-hidden="true" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Call to Action</span>
                                </div>
                                <div className="px-5 py-4">
                                    <input
                                        value={refinedScript.cta}
                                        onChange={e => updateCTA(e.target.value)}
                                        aria-label="Call to action text"
                                        className="w-full bg-transparent border-none text-base font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 rounded placeholder:text-muted-foreground/20"
                                        placeholder="Add your call to action…"
                                    />
                                </div>
                            </div>

                            {/* Generate button */}
                            <div className="pt-2 space-y-3">
                                <Button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || (videoType === "person" ? !portraitImageUrl : !uploadedImages.length)}
                                    className={cn(
                                        "w-full h-14 rounded-2xl font-bold text-sm transition-all duration-200",
                                        "bg-foreground text-background hover:bg-foreground/90",
                                        "shadow-lg shadow-foreground/10 hover:shadow-xl hover:shadow-foreground/15",
                                        "hover:scale-[1.01] active:scale-[0.99]",
                                        "disabled:opacity-30 disabled:scale-100 disabled:shadow-none"
                                    )}
                                >
                                    {isGenerating ? (
                                        <><Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />Starting generation…</>
                                    ) : (
                                        <><Play className="size-4 fill-current mr-2" aria-hidden="true" />Generate Video<CreditBadge amount={3} /></>
                                    )}
                                </Button>
                                {videoType === "person" && !portraitImageUrl && (
                                    <p className="text-center text-xs text-muted-foreground/50">Go back and upload your headshot to continue.</p>
                                )}
                                {videoType !== "person" && !uploadedImages.length && (
                                    <p className="text-center text-xs text-muted-foreground/50">Go back and upload photos to continue.</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── Step 3: Generating ── */}
                {step === 3 && (
                    <motion.div key="render" variants={panelVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                        <StepRibbon currentStep={3} />
                        <div className="py-6 max-w-lg mx-auto space-y-8">
                            {/* Hero spinner */}
                            <div className="flex flex-col items-center text-center space-y-5">
                                <div className="relative" aria-hidden="true">
                                    <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="size-9 text-primary/60" />
                                    </div>
                                    <div className="absolute inset-0 rounded-3xl flex items-center justify-center">
                                        <Loader2 className="size-18 text-primary/20 animate-spin" style={{ strokeWidth: 1 }} />
                                    </div>
                                    {!shouldReduceMotion && (
                                        <div className="absolute -inset-2 rounded-3xl border border-primary/10 animate-pulse" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Generating your video.</h2>
                                    <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">Usually 2–4 minutes. You can safely close this tab —<br className="hidden sm:block" /> we&apos;ll process it in the background.</p>
                                </div>
                            </div>

                            {/* Progress block */}
                            <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-5" role="status" aria-live="polite" aria-label="Generation progress">
                                {/* Stage label */}
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Current stage</span>
                                    <p className="text-sm font-semibold text-foreground leading-snug">{renderProgress.currentStage}</p>
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-border/30 rounded-full overflow-hidden">
                                        {renderProgress.totalClips === 0 ? (
                                            <motion.div
                                                className="h-full w-1/3 bg-primary/40 rounded-full"
                                                animate={{ x: ["0%", "200%"] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                            />
                                        ) : (
                                            <motion.div
                                                className="h-full bg-primary rounded-full"
                                                animate={{ width: `${progressPct}%` }}
                                                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                                            />
                                        )}
                                    </div>
                                    {renderProgress.totalClips > 0 && (
                                        <p className="text-[10px] text-muted-foreground/50 font-medium">
                                            {renderProgress.completedClips} of {renderProgress.totalClips} clips done · {progressPct}%
                                        </p>
                                    )}
                                </div>

                                {/* Per-clip chips */}
                                {(renderProgress.clips?.length ?? 0) > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {renderProgress.clips!.map((clip, i) => {
                                            const isInQueue   = clip.status === "IN_QUEUE";
                                            const isRendering = clip.status === "IN_PROGRESS";
                                            const isDone      = clip.status === "COMPLETED";
                                            const isFailed    = clip.status === "FAILED";
                                            return (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all duration-300",
                                                        isDone      && "bg-green-500/10 border-green-500/20 text-green-400",
                                                        isRendering && "bg-primary/10 border-primary/20 text-primary",
                                                        isInQueue   && "bg-muted/40 border-border/30 text-muted-foreground/50",
                                                        isFailed    && "bg-destructive/10 border-destructive/20 text-destructive/70",
                                                        !isDone && !isRendering && !isInQueue && !isFailed && "bg-muted/40 border-border/30 text-muted-foreground/40",
                                                    )}
                                                >
                                                    {isDone      && <Check className="size-2.5" />}
                                                    {isRendering && <Loader2 className="size-2.5 animate-spin" />}
                                                    {isInQueue   && <span className="size-2 rounded-full bg-muted-foreground/30 inline-block" aria-hidden="true" />}
                                                    {isFailed    && <X className="size-2.5" />}
                                                    <span>
                                                        {clip.label}
                                                        {isInQueue   && clip.queuePosition != null && clip.queuePosition > 0 ? ` · #${clip.queuePosition}` :
                                                         isInQueue   ? " · queued" :
                                                         isRendering ? " · rendering" :
                                                         isDone      ? " · done" :
                                                         isFailed    ? " · failed" : ""}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Engine attribution */}
                                <p className="text-[10px] text-muted-foreground/25 font-bold uppercase tracking-widest">
                                    Aurora · Kling 2.5 · Shotstack
                                </p>
                            </div>

                            {/* Notify CTA */}
                            <button
                                type="button"
                                onClick={() => {
                                    if ("Notification" in window) {
                                        Notification.requestPermission().then(p => {
                                            if (p === "granted") toast.success("We'll notify you when your video is ready.");
                                        });
                                    } else {
                                        toast.info("Notifications not supported in this browser.");
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-2 font-medium rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Bell className="size-3.5" aria-hidden="true" />
                                Notify me when done
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ── Step 4: Done ── */}
                {step === 4 && generatedVideo && (
                    <motion.div key="done" variants={panelVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                        <StepRibbon currentStep={4} />
                        <div className="space-y-8">
                            {/* Header */}
                            <div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1, duration: 0.3 }}
                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-4 border border-primary/20"
                                >
                                    <Sparkles className="size-3" aria-hidden="true" />Production complete
                                </motion.div>
                                <h1 className="text-3xl font-bold tracking-tight ">Your video is ready.</h1>
                            </div>

                            <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
                                {/* Left: video player + actions */}
                                <div className="space-y-4">
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                        className="w-65 aspect-9/16 bg-black rounded-2xl overflow-hidden ring-1 ring-border/30 shadow-2xl shadow-black/30 shrink-0"
                                    >
                                        <video
                                            src={generatedVideo}
                                            controls
                                            className="w-full h-full object-cover"
                                            loop
                                            playsInline
                                            aria-label="Generated video"
                                        />
                                    </motion.div>

                                    {/* Action buttons */}
                                    <div className="flex flex-col gap-2 w-65">
                                        <Button
                                            type="button"
                                            onClick={() => setShowEditor(true)}
                                            size="sm"
                                            className="w-full h-10 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 text-xs transition-all duration-150 hover:scale-[1.01]"
                                        >
                                            <Scissors className="size-3.5 mr-2" aria-hidden="true" />Open Editor
                                        </Button>
                                        <div className="flex gap-2">
                                            <a href={generatedVideo} download="beyond-social-video.mp4" target="_blank" rel="noopener noreferrer" className="flex-1">
                                                <Button size="sm" variant="outline" className="w-full h-10 rounded-xl font-bold text-xs border-border/60 hover:border-foreground/20">
                                                    <Download className="size-3.5 mr-1.5" aria-hidden="true" />Download
                                                </Button>
                                            </a>
                                            <Button size="sm" variant="outline" className="flex-1 h-10 rounded-xl font-bold text-xs border-border/60 hover:border-foreground/20">
                                                <Share2 className="size-3.5 mr-1.5" aria-hidden="true" />Share
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: captions, hashtags, generation info, reset */}
                                <div className="space-y-4 min-w-0">
                                    {/* Captions & hashtags */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="grid sm:grid-cols-2 gap-3"
                                    >
                                        <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                                                    <Type className="size-3" aria-hidden="true" />Captions
                                                </span>
                                                {isFetchingCaptions && <Loader2 className="size-3 animate-spin text-muted-foreground/30" aria-hidden="true" />}
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {autoCaptions.length > 0
                                                    ? autoCaptions.map((cap, i) => (
                                                        <p key={i} className="text-xs font-medium leading-snug bg-muted/30 rounded-lg p-2.5 select-all cursor-text border border-border/20">
                                                            {cap}
                                                        </p>
                                                    ))
                                                    : <p className="text-xs text-muted-foreground/50 text-center py-3">
                                                        {isFetchingCaptions ? "Generating…" : "None"}
                                                    </p>
                                                }
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                                                    <Share2 className="size-3" aria-hidden="true" />Hashtags
                                                </span>
                                                <CreditBadge amount={1} />
                                            </div>
                                            <div className="p-3">
                                                {recommendedHashtags.length > 0
                                                    ? <div className="flex flex-wrap gap-1.5">
                                                        {recommendedHashtags.map((tag, i) => (
                                                            <span key={i} className="text-[10px] font-bold text-primary/70 bg-primary/5 px-2 py-1 rounded-full border border-primary/15 select-all cursor-text">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    : <p className="text-xs text-muted-foreground/50 text-center py-3">
                                                        {isFetchingCaptions ? "Generating…" : "None"}
                                                    </p>
                                                }
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Generation details */}
                                    <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
                                        <div className="px-4 py-2.5 border-b border-border/20">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Generation</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border/20">
                                            {[
                                                { label: "Resolution", value: "1080×1920" },
                                                { label: "Aspect",     value: "9:16" },
                                                { label: "Avatar",     value: "Creatify Aurora" },
                                                { label: "B-roll",     value: "Kling 2.5 Pro" },
                                                { label: "Composer",   value: "Shotstack" },
                                            ].map(({ label, value }) => (
                                                <div key={label} className="flex flex-col gap-0.5 px-4 py-3">
                                                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">{label}</span>
                                                    <span className="text-xs font-bold">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetCreator}
                                        className="w-full h-10 rounded-xl text-xs font-bold border-border/50 hover:border-foreground/20 transition-all duration-150"
                                    >
                                        <Plus className="size-3.5 mr-2" aria-hidden="true" />Create Another Video
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>

            {showEditor && generatedVideo && (
                <VideoEditor
                    videoUrl={generatedVideo}
                    initialCaptions={autoCaptions}
                    onClose={() => setShowEditor(false)}
                    onExport={() => setShowEditor(false)}
                />
            )}
        </div>
    );
}
