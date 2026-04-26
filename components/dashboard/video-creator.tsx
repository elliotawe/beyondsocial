"use client"

import type { RefinedScript } from "@/lib/ai-service";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertCircle, ArrowRight, Check, ImageIcon, Loader2, Play, Sparkles,
    Save, Plus, X, Share2, Download, Scissors, Type, Zap, Mic, Camera,
    Clock, ChevronRight
} from "lucide-react";
import { useState } from "react";
import NextImage from "next/image";
import { Button } from "../ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "../ui/textarea";
import { DiscoveryStep } from "./discovery-step";
import { VideoEditor } from "./video-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";

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

function CreditCost({ amount }: { amount: number }) {
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full ml-2">
            <Zap className="w-2.5 h-2.5" />
            {amount} credit{amount !== 1 ? "s" : ""}
        </span>
    );
}

const STEP_LABELS = ["Discover", "Brief", "Script", "Rendering", "Done"];

function StepProgress({ currentStep }: { currentStep: number }) {
    if (currentStep === 0) return null;
    const steps = [1, 2, 3, 4];
    return (
        <div className="flex items-center justify-center gap-2 mb-8 animate-in fade-in duration-500">
            {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                    <div className={cn(
                        "flex items-center justify-center h-7 rounded-full text-[11px] font-bold transition-all duration-300",
                        currentStep === s
                            ? "bg-primary text-primary-foreground px-3 shadow-lg shadow-primary/30 scale-105"
                            : currentStep > s
                                ? "bg-primary/20 text-primary w-7"
                                : "bg-muted/50 text-muted-foreground/50 w-7"
                    )}>
                        {currentStep > s ? <Check className="w-3.5 h-3.5" /> : currentStep === s ? STEP_LABELS[s] : s}
                    </div>
                    {i < steps.length - 1 && (
                        <div className={cn(
                            "w-8 h-px transition-all duration-500",
                            currentStep > s ? "bg-primary/40" : "bg-border/40"
                        )} />
                    )}
                </div>
            ))}
        </div>
    );
}

const ROLE_CONFIG: Record<string, { color: string; borderColor: string; bgColor: string; label: string }> = {
    hook: { color: "text-amber-500", borderColor: "border-l-amber-500", bgColor: "bg-amber-500/5", label: "Hook" },
    intro: { color: "text-amber-500", borderColor: "border-l-amber-500", bgColor: "bg-amber-500/5", label: "Intro" },
    body: { color: "text-blue-400", borderColor: "border-l-blue-400", bgColor: "bg-blue-500/5", label: "Body" },
    value: { color: "text-blue-400", borderColor: "border-l-blue-400", bgColor: "bg-blue-500/5", label: "Value" },
    cta: { color: "text-primary", borderColor: "border-l-primary", bgColor: "bg-primary/5", label: "CTA" },
    outro: { color: "text-primary", borderColor: "border-l-primary", bgColor: "bg-primary/5", label: "Outro" },
};

function getRoleConfig(role: string) {
    const key = role?.toLowerCase();
    return ROLE_CONFIG[key] ?? { color: "text-muted-foreground", borderColor: "border-l-border", bgColor: "bg-muted/10", label: role || "Scene" };
}

export function VideoCreator() {
    const [step, setStep] = useState(0);
    const [roughIdea, setRoughIdea] = useState("");
    const [style, setStyle] = useState("cinematic");
    const [tone, setTone] = useState("professional");
    const [isRefining, setIsRefining] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [refinedScript, setRefinedScript] = useState<RefinedScript | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showEditor, setShowEditor] = useState(false);

    const [autoCaptions, setAutoCaptions] = useState<string[]>([]);
    const [recommendedHashtags, setRecommendedHashtags] = useState<string[]>([]);
    const [isFetchingCaptions, setIsFetchingCaptions] = useState(false);
    const [useClonedVoice, setUseClonedVoice] = useState(false);

    const [realEstateMode, setRealEstateMode] = useState(false);
    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
    const [suggestedScript, setSuggestedScript] = useState<string | undefined>(undefined);

    const handleSelectBrief = ({ industry, concept, hook, idea, suggestedScript: discoveryScript }: {
        industry: string; concept: string; hook: string; idea: string; suggestedScript?: string;
    }) => {
        setSelectedIndustry(industry);
        setRealEstateMode(industry === "Real Estate");
        setRoughIdea(`Concept: ${concept}\nHook: ${hook}\nContext: ${idea}`);
        setSuggestedScript(discoveryScript);
        setStep(1);
    };

    const handleRefine = async () => {
        if (!roughIdea.trim()) return;
        setIsRefining(true);
        setError(null);
        try {
            const draftResponse = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: roughIdea.slice(0, 30) + "...", roughIdea, style, tone, useClonedVoice }),
            });
            const draftResult = await draftResponse.json();
            if (!draftResponse.ok) throw new Error(draftResult.error || "Failed to create draft");
            const newProjectId = draftResult.projectId;
            setProjectId(newProjectId);

            const refineResponse = await fetch("/api/ai-video/refine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idea: roughIdea, style, tone, industry: selectedIndustry || undefined, realEstateMode, suggestedScript }),
            });
            const refineResult = await refineResponse.json();
            if (!refineResponse.ok) throw new Error(refineResult.error || "Failed to refine idea");

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
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Something went wrong during refinement.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!projectId || !refinedScript) return;
        setIsSaving(true);
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ script: refinedScript, uploadedImages }),
            });
            if (!response.ok) throw new Error((await response.json()).error || "Failed to save draft");
            toast.success("Draft saved.");
        } catch (err: unknown) {
            setError((err as Error).message || "Failed to save draft.");
        } finally {
            setIsSaving(false);
        }
    };

    const updateScene = (index: number, field: "script" | "visual_direction", value: string) => {
        if (!refinedScript) return;
        const newScenes = [...refinedScript.scenes];
        newScenes[index] = { ...newScenes[index], [field]: value };
        setRefinedScript({ ...refinedScript, scenes: newScenes });
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
            const uploadPromises = files.map(async (file: File) => {
                const isVideo = file.type.startsWith("video/");
                const maxSize = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
                if (file.size > maxSize) {
                    throw new Error(`"${file.name}" is too large. Max: ${isVideo ? "15MB" : "5MB"}.`);
                }
                if (!isVideo) {
                    const { width, height } = await getMediaMetadata(file);
                    if (width < 240 || height < 240 || width > 7680 || height > 7680) {
                        throw new Error(`"${file.name}" dimensions (${width}x${height}) are invalid. Must be 240px–7680px.`);
                    }
                }
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        if (event.target?.result) {
                            try {
                                const res = await fetch("/api/upload/image", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ file: event.target.result }),
                                });
                                const result = await res.json() as { success: boolean; url: string; error?: string };
                                if (!res.ok) throw new Error(result.error || "Upload failed");
                                resolve(result.url);
                            } catch (err: unknown) {
                                reject(err instanceof Error ? err : new Error(`Upload failed for "${file.name}"`));
                            }
                        }
                    };
                    reader.readAsDataURL(file);
                });
            });

            const urls = await Promise.all(uploadPromises);
            setUploadedImages(prev => [...prev, ...urls]);
        } catch (err: unknown) {
            setError((err as Error).message || "An error occurred during upload.");
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    const removeImage = (index: number) => setUploadedImages(prev => prev.filter((_, i) => i !== index));

    const handleGenerate = async () => {
        if (!uploadedImages.length || !refinedScript || !projectId) return;
        setError(null);
        setIsGenerating(true);

        try {
            await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ script: refinedScript, uploadedImages }),
            });

            const prompt = `Style: ${refinedScript.video_style}. Tone: ${refinedScript.tone}. ${refinedScript.scenes.map(s => s.visual_direction).join(". ")}`;

            const genResponse = await fetch("/api/ai-video/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: uploadedImages[0],
                    prompt,
                    scriptData: { ...refinedScript, roughIdea, projectId },
                }),
            });
            const genResult = await genResponse.json();
            if (!genResponse.ok) throw new Error(genResult.error || "Generation failed");

            if (genResult.creditsRemaining !== undefined) {
                toast.success(`Video rendering started — ${genResult.creditsRemaining} credits remaining`);
            }

            setStep(3);
            pollStatus(genResult.projectId);
        } catch (err: unknown) {
            setError((err as Error).message || "Failed to start video generation.");
            setIsGenerating(false);
        }
    };

    const fetchCaptionsAndHashtags = async (script: RefinedScript) => {
        if (!script) return;
        setIsFetchingCaptions(true);
        try {
            const res = await fetch("/api/ai-video/captions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    script,
                    industry: selectedIndustry || undefined,
                    platforms: ["TikTok", "Instagram", "LinkedIn"],
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAutoCaptions(data.captions || []);
                setRecommendedHashtags(data.hashtags || []);
                if (data.creditsRemaining !== undefined) {
                    toast.success(`Captions generated — ${data.creditsRemaining} credits remaining`);
                }
            } else {
                setAutoCaptions([
                    script.scenes[0]?.script || "Welcome to Beyond.",
                    script.cta || "Start creating today!",
                ]);
                setRecommendedHashtags([
                    `#${(selectedIndustry || "content").toLowerCase().replace(/\s+/g, "")}`,
                    "#beyondsocial",
                    "#aivirals",
                    "#contentcreator",
                ]);
                if (data.error) toast.error(data.error);
            }
        } catch {
            setAutoCaptions([script.scenes[0]?.script || "Beyond Social.", script.cta || "Create more."]);
        } finally {
            setIsFetchingCaptions(false);
        }
    };

    const pollStatus = async (id: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/ai-video/status/${id}`);
                const result = await response.json();

                if (result.status === "completed" && result.videoUrl) {
                    clearInterval(interval);
                    setGeneratedVideo(result.videoUrl);
                    setIsGenerating(false);
                    setStep(4);
                    if (result.script) {
                        await fetchCaptionsAndHashtags(result.script);
                    }
                } else if (result.status === "failed") {
                    clearInterval(interval);
                    setError("Video generation failed. Your credits have been refunded.");
                    setIsGenerating(false);
                }
            } catch (err: unknown) {
                console.error("Polling error:", err);
                if (err instanceof Error && err.message?.includes("not found")) {
                    clearInterval(interval);
                    setIsGenerating(false);
                    setError("Project not found.");
                }
            }
        }, 3000);
    };

    const resetCreator = () => {
        setStep(0);
        setRoughIdea("");
        setStyle("cinematic");
        setTone("professional");
        setRefinedScript(null);
        setUploadedImages([]);
        setGeneratedVideo(null);
        setProjectId(null);
        setSelectedIndustry(null);
        setAutoCaptions([]);
        setRecommendedHashtags([]);
        setError(null);
    };

    return (
        <div className="">
            {step === 0 && <DiscoveryStep onSelectBrief={handleSelectBrief} />}

            {/* ── STEP 1: Brief & Media ── */}
            {step === 1 && (
                <div className="flex flex-col items-center justify-center min-h-[70vh] py-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
                    <div className="w-full max-w-4xl space-y-8">
                        <StepProgress currentStep={step} />

                        <div className="text-center space-y-3">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-outfit bg-linear-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
                                Set the scene.
                            </h1>
                            <p className="text-muted-foreground text-base max-w-lg mx-auto">
                                Upload a reference image and describe your vision. Wan 2.6 Flash will bring it to life.
                            </p>
                        </div>

                        {error && (
                            <Alert variant="destructive" className="max-w-xl mx-auto">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid md:grid-cols-[1fr_1.2fr] gap-6 items-start">
                            {/* Left: Upload */}
                            <div className="space-y-4">
                                <div
                                    className={cn(
                                        "border-2 border-dashed border-border/60 hover:border-primary/50 rounded-3xl p-8 text-center space-y-4 transition-all duration-500 bg-card/20 backdrop-blur-sm group relative overflow-hidden cursor-pointer min-h-[220px] flex flex-col items-center justify-center",
                                        uploadedImages.length > 0 && "border-primary/40 bg-primary/5"
                                    )}
                                >
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <input
                                        type="file"
                                        multiple
                                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                        accept="image/*,video/mp4,video/quicktime"
                                    />
                                    <div className="relative z-0 mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                                        {isUploading ? (
                                            <Loader2 className="w-7 h-7 text-primary animate-spin" />
                                        ) : uploadedImages.length > 0 ? (
                                            <Check className="w-7 h-7 text-primary" />
                                        ) : (
                                            <ImageIcon className="w-7 h-7 text-primary" />
                                        )}
                                    </div>
                                    <div className="space-y-1 relative z-0">
                                        <p className="font-semibold text-base">
                                            {isUploading ? "Uploading…" : uploadedImages.length > 0 ? `${uploadedImages.length} file(s) ready` : "Drop image or video here"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {uploadedImages.length > 0 ? "Click to add more" : realEstateMode ? "Property tour video recommended" : "JPG, PNG, MP4 · Max 5MB"}
                                        </p>
                                    </div>
                                </div>

                                {uploadedImages.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {uploadedImages.map((url, i) => (
                                            <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-border/50 group relative shadow-md">
                                                <NextImage
                                                    src={url}
                                                    alt="Uploaded"
                                                    className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-700"
                                                    width={64}
                                                    height={64}
                                                    unoptimized={url.startsWith("data:")}
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                    <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={() => removeImage(i)}>
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {realEstateMode && (
                                    <Alert className="bg-primary/5 border-primary/20 rounded-2xl animate-in fade-in zoom-in">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        <AlertTitle className="text-xs font-bold uppercase tracking-widest text-primary">Advanced Agent Mode</AlertTitle>
                                        <AlertDescription className="text-sm text-primary/80">
                                            Our AI will insert an agent avatar into your property tour.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            {/* Right: Style, Tone, Idea */}
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Style</label>
                                        <Select value={style} onValueChange={setStyle}>
                                            <SelectTrigger className="h-10 bg-card/50 border-border/40 text-sm rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cinematic">Cinematic</SelectItem>
                                                <SelectItem value="vlog">Authentic Vlog</SelectItem>
                                                <SelectItem value="luxury">Luxury & Premium</SelectItem>
                                                <SelectItem value="minimalist">Clean Minimalist</SelectItem>
                                                <SelectItem value="vibrant">Vibrant & High-Energy</SelectItem>
                                                <SelectItem value="cyberpunk">Neon Cyberpunk</SelectItem>
                                                <SelectItem value="documentary">Documentary</SelectItem>
                                                <SelectItem value="futuristic">Futuristic Tech</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Tone</label>
                                        <Select value={tone} onValueChange={setTone}>
                                            <SelectTrigger className="h-10 bg-card/50 border-border/40 text-sm rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="professional">Professional</SelectItem>
                                                <SelectItem value="humorous">Humorous & Witty</SelectItem>
                                                <SelectItem value="inspiring">Inspiring</SelectItem>
                                                <SelectItem value="urgency">Urgent & Sales</SelectItem>
                                                <SelectItem value="relatable">Warm & Relatable</SelectItem>
                                                <SelectItem value="mysterious">Mysterious</SelectItem>
                                                <SelectItem value="hype">High-Energy Hype</SelectItem>
                                                <SelectItem value="calm">Calm & Reflective</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Voice toggle */}
                                <button
                                    onClick={() => setUseClonedVoice(!useClonedVoice)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium",
                                        useClonedVoice
                                            ? "bg-primary/10 border-primary/30 text-primary"
                                            : "bg-card/40 border-border/40 text-muted-foreground hover:border-primary/20"
                                    )}
                                >
                                    <span className="flex items-center gap-2">
                                        <div className={cn("size-2 rounded-full transition-all", useClonedVoice ? "bg-primary animate-pulse" : "bg-muted-foreground/40")} />
                                        {useClonedVoice ? "Cloned Voice Active" : "Standard AI Voice"}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Toggle</span>
                                </button>

                                {/* Main idea textarea */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Video Idea</label>
                                    <div className={cn(
                                        "relative bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 shadow-xl transition-all duration-500 focus-within:ring-2 focus-within:ring-primary/30 focus-within:bg-card",
                                        (uploadedImages.length === 0) && "opacity-50 pointer-events-none"
                                    )}>
                                        <Textarea
                                            rows={4}
                                            placeholder={uploadedImages.length === 0 ? "Upload an image first…" : "Describe your video concept, target audience, and key message…"}
                                            className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40 resize-none font-medium text-base p-4"
                                            value={roughIdea}
                                            onChange={(e) => setRoughIdea(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey && roughIdea.trim() && uploadedImages.length > 0) {
                                                    e.preventDefault();
                                                    handleRefine();
                                                }
                                            }}
                                        />
                                        <div className="px-4 pb-3 flex items-center justify-between">
                                            <p className="text-[10px] text-muted-foreground/40 font-medium">
                                                Script refinement · 1 credit · 720P optimal
                                            </p>
                                            <Button
                                                onClick={handleRefine}
                                                disabled={isRefining || !roughIdea.trim() || uploadedImages.length === 0}
                                                size="sm"
                                                className="h-8 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs font-bold px-4"
                                            >
                                                {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ArrowRight className="h-3.5 w-3.5 mr-1.5" />}
                                                {isRefining ? "Refining…" : "Refine Script"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Script Editor ── */}
            {step === 2 && refinedScript && (
                <div className="max-w-3xl mx-auto space-y-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <StepProgress currentStep={step} />

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold">Script Review</h2>
                                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5 font-bold">
                                    {refinedScript.scenes.length} scenes
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm pl-10">Edit each scene before generating your video.</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="rounded-full px-4 text-xs font-bold uppercase tracking-wider h-9">
                                Back
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving} className="rounded-full px-5 h-9">
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                Save Draft
                            </Button>
                        </div>
                    </div>

                    {/* Script metadata strip */}
                    <div className="flex flex-wrap gap-4 px-4 py-3 bg-card/40 rounded-2xl border border-border/30 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                            <span className="font-semibold uppercase tracking-wider">Style</span>
                            <span className="font-bold text-foreground capitalize">{refinedScript.video_style}</span>
                        </div>
                        <div className="w-px h-4 bg-border/40 self-center hidden sm:block" />
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-accent/60 shrink-0" />
                            <span className="font-semibold uppercase tracking-wider">Tone</span>
                            <span className="font-bold text-foreground capitalize">{refinedScript.tone}</span>
                        </div>
                        <div className="w-px h-4 bg-border/40 self-center hidden sm:block" />
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span className="font-bold text-foreground">
                                {refinedScript.scenes.reduce((acc, s) => acc + (s.duration_seconds || 0), 0)}s total
                            </span>
                        </div>
                    </div>

                    {/* Scene cards */}
                    <div className="space-y-3">
                        {refinedScript.scenes.map((scene, idx) => {
                            const roleConfig = getRoleConfig(scene.role);
                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        "group relative rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 hover:border-border/80 hover:shadow-lg hover:shadow-black/20",
                                        roleConfig.bgColor
                                    )}
                                >
                                    {/* Colored left accent bar */}
                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", roleConfig.borderColor.replace("border-l-", "bg-"))} />

                                    {/* Scene header */}
                                    <div className="flex items-center justify-between px-5 pt-4 pb-3 pl-6">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                                "h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                                                `bg-border/50 text-muted-foreground`
                                            )}>
                                                {idx + 1}
                                            </div>
                                            <span className={cn("text-[11px] font-black uppercase tracking-widest", roleConfig.color)}>
                                                {roleConfig.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-bold">
                                            <Clock className="w-3 h-3" />
                                            {scene.duration_seconds}s
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="mx-5 h-px bg-border/30" />

                                    {/* Content: Voiceover + Visual Direction */}
                                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30">
                                        {/* Voiceover */}
                                        <div className="p-5 pl-6 space-y-2">
                                            <div className="flex items-center gap-1.5">
                                                <Mic className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Voiceover Script</label>
                                            </div>
                                            <Textarea
                                                value={scene.script}
                                                onChange={e => updateScene(idx, "script", e.target.value)}
                                                className="bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 p-2 text-base leading-relaxed min-h-[90px] resize-none rounded-xl placeholder:text-muted-foreground/30 font-medium"
                                                placeholder="Voiceover text…"
                                            />
                                        </div>

                                        {/* Visual Direction */}
                                        <div className="p-5 space-y-2">
                                            <div className="flex items-center gap-1.5">
                                                <Camera className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Visual Direction</label>
                                            </div>
                                            <Textarea
                                                value={scene.visual_direction}
                                                onChange={e => updateScene(idx, "visual_direction", e.target.value)}
                                                className="bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 p-2 text-sm italic text-muted-foreground leading-relaxed min-h-[90px] resize-none rounded-xl placeholder:text-muted-foreground/30"
                                                placeholder="Describe what happens visually…"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* CTA block */}
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
                        <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-primary/10">
                            <ChevronRight className="w-3.5 h-3.5 text-primary" />
                            <label className="text-[10px] font-black text-primary uppercase tracking-widest">Call to Action</label>
                        </div>
                        <div className="px-5 py-4">
                            <input
                                value={refinedScript.cta}
                                onChange={e => updateCTA(e.target.value)}
                                className="w-full bg-transparent border-none text-lg font-bold focus:outline-none placeholder:text-primary/20 text-foreground"
                                placeholder="Add your call to action…"
                            />
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Generate button */}
                    <div className="pt-2">
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating || !uploadedImages.length}
                            className="w-full h-14 rounded-2xl font-bold shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 text-base"
                        >
                            {isGenerating ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Starting Generation…
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Play className="w-5 h-5 fill-current" />
                                    Generate Video
                                    <CreditCost amount={3} />
                                </span>
                            )}
                        </Button>
                        {!uploadedImages.length && (
                            <p className="text-center text-xs text-destructive/70 mt-2">Go back and upload an image to continue</p>
                        )}
                    </div>
                </div>
            )}

            {/* ── STEP 3: Processing ── */}
            {step === 3 && (
                <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 animate-in fade-in slide-in-from-bottom-8">
                    <StepProgress currentStep={step} />
                    <div className="w-full max-w-lg text-center space-y-10">
                        <div className="space-y-5">
                            <div className="relative mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
                                <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-ping opacity-30" />
                                <Loader2 className="w-12 h-12 text-primary animate-spin relative" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight">Rendering your video</h2>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Wan 2.6 Flash is processing your script and images. Usually 60–90 seconds.
                                </p>
                            </div>
                        </div>
                        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-muted-foreground">Status</span>
                                <span className="text-primary animate-pulse font-bold">In Progress</span>
                            </div>
                            <div className="h-1.5 w-full bg-border/30 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full w-2/3 animate-pulse" style={{ transition: 'width 3s ease-in-out' }} />
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold">Flash Generation Engine Active</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 4: Complete ── */}
            {step === 4 && generatedVideo && (
                <div className="max-w-5xl mx-auto space-y-10 py-10 animate-in fade-in zoom-in duration-700">
                    <StepProgress currentStep={step} />

                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                            <Sparkles className="w-3.5 h-3.5" />
                            Production Complete
                        </div>
                        <h2 className="text-4xl font-bold tracking-tight font-outfit">Your video is ready</h2>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
                        {/* Main: video + actions + captions */}
                        <div className="space-y-6">
                            <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border/50">
                                <video src={generatedVideo} controls className="w-full h-full object-contain" loop playsInline />
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button size="lg" onClick={() => setShowEditor(true)} className="rounded-2xl bg-primary text-primary-foreground px-6 h-12 font-bold shadow-xl shadow-primary/20">
                                    <Scissors className="w-4 h-4 mr-2" />
                                    Open Editor
                                </Button>
                                <a href={generatedVideo} download="beyond-social-video.mp4" target="_blank" rel="noopener noreferrer">
                                    <Button size="lg" className="rounded-2xl bg-foreground text-background px-6 h-12 font-bold">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                </a>
                                <Button size="lg" variant="outline" className="rounded-2xl px-6 h-12 font-bold border-border/50">
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                </Button>
                            </div>

                            {/* Captions & Hashtags */}
                            <div className="grid sm:grid-cols-2 gap-4 animate-in fade-in duration-700 delay-300">
                                <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Type className="size-3.5" />
                                            Captions
                                        </h3>
                                        {isFetchingCaptions && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {autoCaptions.length > 0 ? (
                                            autoCaptions.map((cap, i) => (
                                                <div key={i} className="p-3 bg-muted/30 rounded-xl text-sm font-medium border border-border/20 select-all cursor-text leading-snug">
                                                    {cap}
                                                </div>
                                            ))
                                        ) : isFetchingCaptions ? (
                                            <div className="py-4 text-center text-muted-foreground text-sm animate-pulse">Generating captions…</div>
                                        ) : (
                                            <div className="py-4 text-center text-muted-foreground text-sm">No captions generated.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-2">
                                            <Share2 className="size-3.5" />
                                            Hashtags
                                        </h3>
                                        <CreditCost amount={1} />
                                    </div>
                                    <div className="p-4">
                                        {recommendedHashtags.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {recommendedHashtags.map((tag, i) => (
                                                    <Badge key={i} variant="outline" className="bg-accent/5 text-accent border-accent/20 px-3 py-1 text-sm rounded-full select-all cursor-text font-medium">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : isFetchingCaptions ? (
                                            <div className="py-4 text-center text-muted-foreground text-sm animate-pulse">Generating hashtags…</div>
                                        ) : null}
                                        {!isFetchingCaptions && <p className="text-[10px] text-muted-foreground italic mt-3">Optimised for high-reach feed placement.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar: details + reset */}
                        <div className="space-y-4">
                            <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden">
                                <div className="px-5 py-3 border-b border-border/30">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Generation Details</h3>
                                </div>
                                <div className="divide-y divide-border/30">
                                    {[
                                        { label: "Resolution", value: "1080×1920 (9:16)" },
                                        { label: "Model", value: "Wan AI 2.6 Flash" },
                                        { label: "Duration", value: "15 Seconds" },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex justify-between items-center px-5 py-3">
                                            <span className="text-sm text-muted-foreground font-medium">{label}</span>
                                            <span className="text-sm font-bold">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={resetCreator}
                                className="w-full h-12 rounded-2xl font-bold border-primary/20 hover:bg-primary/5"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Another Video
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showEditor && generatedVideo && (
                <VideoEditor
                    videoUrl={generatedVideo}
                    initialCaptions={autoCaptions}
                    onClose={() => setShowEditor(false)}
                    onExport={(url) => {
                        console.log("Exporting...", url);
                        setShowEditor(false);
                    }}
                />
            )}
        </div>
    );
}
