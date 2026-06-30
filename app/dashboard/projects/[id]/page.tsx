"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    ArrowLeft,
    Download,
    Clock,
    AlertCircle,
    Sparkles,
    Type,
    Video,
    Share2,
    ExternalLink,
    Zap,
    Loader2,
    Check,
    X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectScheduler } from "@/components/dashboard/project-scheduler";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { IProject } from "@/lib/types";

interface LiveProgress {
    totalClips: number;
    completedClips: number;
    currentStage: string;
    clips: { type: "avatar" | "broll"; label: string; status: string; queuePosition?: number }[];
    completedClipUrls: string[];
    audioUrl?: string | null;
    avatarClipUrl?: string | null;
    brollClipUrls?: string[];
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [project, setProject] = useState<IProject | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [liveProgress, setLiveProgress] = useState<LiveProgress | null>(null);
    const sseRef = useRef<EventSource | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchProject() {
            try {
                const res = await fetch(`/api/projects/${id}`);
                if (!res.ok) {
                    if (res.status === 404) {
                        router.push("/404");
                        return;
                    }
                    throw new Error("Failed to fetch project");
                }
                const data = await res.json();
                setProject(data.project);

                // If the project is in-progress when the user lands, open the SSE stream
                // immediately so they see live status without needing the creator page.
                if (data.project?.status === "processing" || data.project?.status === "queued") {
                    const es = new EventSource(`/api/ai-video/stream/${id}`);
                    sseRef.current = es;

                    es.addEventListener("progress", (e) => {
                        try {
                            const result = JSON.parse((e as MessageEvent).data);
                            if (result.progress) {
                                setLiveProgress({
                                    totalClips: result.progress.totalClips ?? 0,
                                    completedClips: result.progress.completedClips ?? 0,
                                    currentStage: result.progress.currentStage ?? "Processing…",
                                    clips: result.progress.clips ?? [],
                                    completedClipUrls: result.progress.completedClipUrls ?? [],
                                    audioUrl: result.progress.audioUrl ?? null,
                                    avatarClipUrl: result.progress.avatarClipUrl ?? null,
                                    brollClipUrls: result.progress.brollClipUrls ?? [],
                                });
                            }
                            if (result.status === "completed" && result.videoUrl) {
                                es.close();
                                setProject(prev => prev ? { ...prev, status: "completed", videoUrl: result.videoUrl } : prev);
                                setLiveProgress(null);
                                toast.success("Your video is ready!");
                            } else if (result.status === "failed") {
                                es.close();
                                setProject(prev => prev ? { ...prev, status: "failed" } : prev);
                                setLiveProgress(null);
                                toast.error(result.error ?? "Video generation failed.");
                            }
                        } catch { /* malformed event */ }
                    });

                    es.addEventListener("error", (e) => {
                        const data = (e as MessageEvent).data;
                        if (!data) return; // connection drop — browser auto-reconnects
                        es.close();
                        setLiveProgress(null);
                    });
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to load project details");
            } finally {
                setIsLoading(false);
            }
        }
        fetchProject();

        return () => {
            sseRef.current?.close();
        };
    }, [id, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!project) return null;

    const isCompleted = project.status === "completed";
    const isProcessing = project.status === "processing";

    return (
        <div className="min-h-screen pb-20 space-y-10 animate-in fade-in duration-500">
            {/* Top Navigation Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-8 mt-4">
                <div className="flex items-center gap-6">
                    <Button variant="outline" size="icon" asChild className="rounded-2xl border-border/40 hover:bg-card/80 transition-all shrink-0">
                        <Link href="/dashboard/projects">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold  tracking-tight">{project.title}</h1>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "px-3 py-1 rounded-full font-bold uppercase tracking-widest text-[10px] border-none",
                                    isCompleted ? "bg-emerald-500/10 text-emerald-500" :
                                        isProcessing ? "bg-blue-500/10 text-blue-500 animate-pulse" :
                                            "bg-muted/10 text-muted-foreground"
                                )}
                            >
                                {project.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 opacity-60" />
                                Created {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                            <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-widest font-bold">
                                ID: {project._id.slice(-6)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isCompleted && project.videoUrl && (
                        <>
                            <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold shadow-sm" asChild>
                                <a href={project.videoUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Preview URL
                                </a>
                            </Button>
                            <Button className="rounded-2xl h-12 px-8 font-bold shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                                <a href={project.videoUrl} download>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download 4K
                                </a>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Live generation progress banner — shown when the user returns to an in-progress project */}
            {liveProgress && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4" role="status" aria-live="polite">
                    <div className="flex items-center gap-3">
                        <Loader2 className="size-4 text-primary animate-spin" aria-hidden="true" />
                        <p className="text-sm font-semibold text-foreground">{liveProgress.currentStage}</p>
                    </div>

                    {liveProgress.totalClips > 0 && (
                        <div className="space-y-1.5">
                            <div className="h-1.5 w-full bg-border/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-700"
                                    style={{ width: `${Math.round((liveProgress.completedClips / liveProgress.totalClips) * 100)}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground/50 font-medium">
                                {liveProgress.completedClips} of {liveProgress.totalClips} clips done
                            </p>
                        </div>
                    )}

                    {liveProgress.clips.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {liveProgress.clips.map((clip, i) => {
                                const isDone = clip.status === "COMPLETED";
                                const isRendering = clip.status === "IN_PROGRESS";
                                const isQueued = clip.status === "IN_QUEUE";
                                const isFailed = clip.status === "FAILED";
                                return (
                                    <div key={i} className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border",
                                        isDone && "bg-green-500/10 border-green-500/20 text-green-400",
                                        isRendering && "bg-primary/10 border-primary/20 text-primary",
                                        isQueued && "bg-muted/40 border-border/30 text-muted-foreground/50",
                                        isFailed && "bg-destructive/10 border-destructive/20 text-destructive/70",
                                        !isDone && !isRendering && !isQueued && !isFailed && "bg-muted/40 border-border/30 text-muted-foreground/40",
                                    )}>
                                        {isDone && <Check className="size-2.5" />}
                                        {isRendering && <Loader2 className="size-2.5 animate-spin" />}
                                        {isQueued && <span className="size-2 rounded-full bg-muted-foreground/30 inline-block" />}
                                        {isFailed && <X className="size-2.5" />}
                                        <span>{clip.label}{isQueued && clip.queuePosition ? ` · #${clip.queuePosition}` : isRendering ? " · rendering" : isDone ? " · done" : isFailed ? " · failed" : ""}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {liveProgress.audioUrl && (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Check className="size-3 text-green-400 shrink-0" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">Voiceover ready</span>
                            </div>
                            <audio src={liveProgress.audioUrl} controls className="w-full h-8" aria-label="Generated voiceover preview" />
                        </div>
                    )}

                    {liveProgress.completedClipUrls.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Clips ready — assembling final video</p>
                            <div className="flex gap-3 flex-wrap">
                                {liveProgress.completedClipUrls.map((url, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="relative w-14 aspect-9/16 rounded-lg overflow-hidden bg-black border border-border/30">
                                            <video src={url} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                                            <div className="absolute bottom-1 right-1 size-3.5 rounded-full bg-green-500/80 flex items-center justify-center">
                                                <Check className="size-2 text-white" />
                                            </div>
                                        </div>
                                        <p className="text-[8px] font-bold text-muted-foreground/40 text-center uppercase tracking-wide">Clip {i + 1}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Creative Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                {/* Left Column: The Preview Stage (Sticky) */}
                <div className="lg:col-span-5 flex justify-center">
                    <div className="sticky top-24 w-full max-w-[360px] space-y-8">
                        {/* Video Mockup Container */}
                        <div className="relative group">
                            {/* Decorative Background Glow */}
                            <div className="absolute -inset-4 bg-primary/20 rounded-[60px] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />

                            <div className="relative aspect-9/16 bg-black rounded-[48px] overflow-hidden border-8 border-card shadow-2xl ring-1 ring-border/50 group-hover:ring-primary/30 transition-all duration-700">
                                {project.videoUrl ? (
                                    <video
                                        src={project.videoUrl}
                                        controls
                                        className="w-full h-full object-cover"
                                        poster={project.thumbnail || undefined}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-10 text-center bg-zinc-950">
                                        {isProcessing ? (
                                            <div className="space-y-6">
                                                <div className="relative mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                    <Zap className="w-8 h-8 text-primary animate-pulse" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-white font-bold text-lg">Generating Content</p>
                                                    <p className="text-sm opacity-60">Creating your clips and assembling the final video…</p>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary w-2/3 animate-[shimmer_2s_infinite]" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <AlertCircle className="w-12 h-12 mx-auto opacity-20" />
                                                <p className="font-bold">Media Unavailable</p>
                                                <p className="text-xs opacity-50">This project is in {project.status} state.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Specs Card */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-[28px] bg-card/40 border border-border/40 backdrop-blur-sm text-center space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Format</p>
                                <p className="font-bold ">Vertical (9:16)</p>
                            </div>
                            <div className="p-4 rounded-[28px] bg-card/40 border border-border/40 backdrop-blur-sm text-center space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Quality</p>
                                <p className="font-bold ">AI · 1080p</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Creative Details & Distribution */}
                <div className="lg:col-span-7 space-y-10">

                    {/* Distribution Section (Priority) */}
                    {isCompleted && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-100">
                            <h3 className="text-lg font-bold  mb-4 flex items-center gap-2">
                                <Share2 className="w-5 h-5 text-primary" />
                                Distribution & Scheduling
                            </h3>
                            <ProjectScheduler
                                projectId={project._id}
                                initialScheduledAt={project.scheduledAt}
                                initialPlatforms={project.socialPlatforms}
                                socialStatus={project.socialStatus}
                            />
                        </div>
                    )}

                    {/* Partial clips — visible from the project page even mid-generation */}
                    {isProcessing && (project.avatarClipUrl || (project.brollClipUrls?.length ?? 0) > 0) && !liveProgress && (
                        <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-3 animate-in fade-in duration-500">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Clips generated so far</p>
                            <div className="flex gap-3 flex-wrap">
                                {project.avatarClipUrl && (
                                    <div className="space-y-1.5">
                                        <div className="relative w-20 aspect-9/16 rounded-xl overflow-hidden bg-black border border-border/30">
                                            <video src={project.avatarClipUrl} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                                            <div className="absolute bottom-1 right-1 size-4 rounded-full bg-green-500/80 flex items-center justify-center">
                                                <Check className="size-2.5 text-white" />
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-bold text-muted-foreground/50 text-center uppercase tracking-wide">Presenter</p>
                                    </div>
                                )}
                                {project.brollClipUrls?.map((url, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="relative w-20 aspect-9/16 rounded-xl overflow-hidden bg-black border border-border/30">
                                            <video src={url} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                                            <div className="absolute bottom-1 right-1 size-4 rounded-full bg-green-500/80 flex items-center justify-center">
                                                <Check className="size-2.5 text-white" />
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-bold text-muted-foreground/50 text-center uppercase tracking-wide">Scene {i + 1}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground/30">Final video is still being assembled — check back shortly.</p>
                        </div>
                    )}

                    {/* Creative Blueprint */}
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold  flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Creative Blueprint
                            </h3>
                            {project.script && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 rounded-full px-3">
                                        {project.script.video_style}
                                    </Badge>
                                    <Badge variant="secondary" className="bg-accent/5 text-accent border-accent/10 rounded-full px-3">
                                        {project.script.tone}
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {project.script ? (
                                <div className="space-y-4 relative pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-linear-to-b before:from-primary/40 before:to-transparent">
                                    {project.script.scenes.map((scene, idx: number) => (
                                        <div key={idx} className="relative group">
                                            {/* Timeline Node */}
                                            <div className="absolute -left-[25px] top-6 w-4 h-4 rounded-full border-2 border-primary bg-background z-10 shadow-sm group-hover:scale-125 transition-transform" />

                                            <Card className="rounded-[32px] border-border/40 bg-card/40 hover:bg-card/60 transition-colors overflow-hidden">
                                                <CardContent className="p-6">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest py-1 px-3 bg-primary/10 rounded-full">
                                                                Scene {scene.scene_id}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                {scene.role || "Body"}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-bold text-muted-foreground/60 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {scene.duration_seconds}s
                                                        </span>
                                                    </div>

                                                    <div className="grid md:grid-cols-[1fr_200px] gap-6 items-start">
                                                        <div className="space-y-4">
                                                            <div className="space-y-1">
                                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Script</p>
                                                                <p className="text-lg font-medium leading-relaxed italic pr-4">
                                                                    &quot;{scene.script}&quot;
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/20 space-y-2">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                                <Video className="w-3 h-3" /> Visuals
                                                            </p>
                                                            <p className="text-xs text-muted-foreground leading-relaxed italic">
                                                                {scene.visual_direction}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    ))}

                                    {/* Final CTA */}
                                    <div className="relative pt-4 pl-4">
                                        <div className="absolute -left-[5px] top-10 w-4 h-4 rounded-full border-2 border-emerald-500 bg-background z-10" />
                                        <div className="p-6 rounded-[32px] bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <Type className="w-4 h-4" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest">Post-Roll Call to Action</p>
                                            </div>
                                            <p className="text-xl font-bold  tracking-tight">
                                                {project.script.cta}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Card className="rounded-[32px] border-border/40 bg-muted/10">
                                    <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm italic">
                                        <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                                        Blueprint data is missing for this project.
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
