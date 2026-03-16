import { getProjectById } from "@/app/actions/projects";
import { notFound } from "next/navigation";
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
    Zap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectScheduler } from "@/components/dashboard/project-scheduler";
import { cn } from "@/lib/utils";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const project = await getProjectById(id);

    if (!project) {
        notFound();
    }

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
                            <h1 className="text-3xl font-bold font-outfit tracking-tight">{project.title}</h1>
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
                                                    <p className="text-sm opacity-60">Wan 2.6 Flash Engine is rendering your video...</p>
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
                                <p className="font-bold font-outfit">Vertical (9:16)</p>
                            </div>
                            <div className="p-4 rounded-[28px] bg-card/40 border border-border/40 backdrop-blur-sm text-center space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Engine</p>
                                <p className="font-bold font-outfit">Wan 2.6 Flash</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Creative Details & Distribution */}
                <div className="lg:col-span-7 space-y-10">

                    {/* Distribution Section (Priority) */}
                    {isCompleted && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-100">
                            <h3 className="text-lg font-bold font-outfit mb-4 flex items-center gap-2">
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

                    {/* Creative Blueprint */}
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold font-outfit flex items-center gap-2">
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
                                    {project.script.scenes.map((scene: any, idx: number) => (
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
                                                                    "{scene.script}"
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
                                            <p className="text-xl font-bold font-outfit tracking-tight">
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
