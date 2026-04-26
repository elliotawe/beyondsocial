"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Search, Sparkles, Check, Loader2, TrendingUp, Zap, ArrowRight,
    ArrowLeft, Play, Heart, MessageCircle, Share2, Music2, RefreshCw,
    Lightbulb, Clock, ExternalLink, ChevronRight, User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { TikTokVideo } from "@/app/api/tiktok-search/route"

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiscoveryStepProps {
    onSelectBrief: (brief: {
        industry: string;
        concept: string;
        hook: string;
        idea: string;
        suggestedScript?: string;
    }) => void;
}

type DiscoveryView = "home" | "trends" | "refine"

interface Question {
    id: string;
    label: string;
    question: string;
    options: string[];
}

interface RefinedBrief {
    hook: string;
    scriptOutline: Array<{ part: string; description: string }>;
    hashtags: string[];
    videoLength: string;
    titleVariations: string[];
    industry: string;
    concept: string;
    suggestedSearch?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
    if (!n) return "0"
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
    return String(n)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ModeCard({
    icon: Icon,
    title,
    description,
    cta,
    accent,
    onClick,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    cta: string;
    accent: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative w-full text-left rounded-3xl border border-border/50 bg-card/40 backdrop-blur-sm p-8 transition-all duration-300",
                "hover:border-border hover:bg-card hover:shadow-2xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            )}
        >
            <div className={cn("absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300", accent)} />
            <div className="relative z-10 space-y-5">
                <div className={cn("inline-flex items-center justify-center w-14 h-14 rounded-2xl transition-transform duration-300 group-hover:scale-110", accent.replace("bg-", "bg-").replace("opacity-0", "opacity-100"))}>
                    <Icon className="size-7" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold leading-tight">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 duration-200">
                    {cta} <ArrowRight className="size-4" />
                </div>
            </div>
        </button>
    )
}

function VideoCard({
    video,
    onUse,
    isSelected,
    isLoading,
}: {
    video: TikTokVideo;
    onUse: (video: TikTokVideo) => void;
    isSelected: boolean;
    isLoading: boolean;
}) {
    return (
        <div
            className={cn(
                "group relative rounded-2xl border border-border/40 bg-card/30 overflow-hidden transition-all duration-300",
                "hover:border-border hover:bg-card hover:shadow-xl hover:shadow-black/20",
                isSelected && "ring-2 ring-primary border-transparent"
            )}
        >
            {/* Thumbnail */}
            <div className="aspect-video relative overflow-hidden bg-muted/30">
                {video.cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={video.cover}
                        alt={video.desc}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Play className="size-10 text-muted-foreground/30" />
                    </div>
                )}

                {/* Duration badge */}
                {video.duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                        {video.duration}s
                    </div>
                )}

                {/* View on TikTok overlay */}
                <a
                    href={video.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="View on TikTok"
                >
                    <ExternalLink className="size-2.5" /> TikTok
                </a>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Author */}
                <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center">
                        {video.author.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={video.author.avatar} alt={video.author.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <User className="size-4 text-muted-foreground/50" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-tight">{video.author.name || video.author.handle}</p>
                        {video.author.handle && (
                            <p className="text-[10px] text-muted-foreground/60 truncate">@{video.author.handle}</p>
                        )}
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm line-clamp-2 leading-snug text-muted-foreground">
                    {video.desc || "No description"}
                </p>

                {/* Hashtags */}
                {video.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {video.hashtags.slice(0, 4).map((tag, i) => (
                            <span key={i} className="text-[10px] font-bold text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 font-medium">
                    <span className="flex items-center gap-1">
                        <Play className="size-3 fill-current" />{fmtNum(video.stats.plays)}
                    </span>
                    <span className="flex items-center gap-1">
                        <Heart className="size-3 fill-current" />{fmtNum(video.stats.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                        <MessageCircle className="size-3 fill-current" />{fmtNum(video.stats.comments)}
                    </span>
                    <span className="flex items-center gap-1">
                        <Share2 className="size-3" />{fmtNum(video.stats.shares)}
                    </span>
                </div>

                {/* Music */}
                {video.music.title && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 font-medium truncate">
                        <Music2 className="size-3 shrink-0" />
                        <span className="truncate">{video.music.title}{video.music.author ? ` · ${video.music.author}` : ""}</span>
                    </div>
                )}

                {/* CTA */}
                <Button
                    size="sm"
                    onClick={() => onUse(video)}
                    disabled={isLoading}
                    className="w-full h-9 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {isLoading && isSelected ? (
                        <><Loader2 className="size-3.5 animate-spin mr-1.5" />Building brief…</>
                    ) : (
                        <><Sparkles className="size-3.5 mr-1.5" />Use as inspiration</>
                    )}
                </Button>
            </div>

            {/* Selection overlay */}
            <AnimatePresence>
                {isSelected && isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center"
                    >
                        <div className="text-center space-y-2">
                            <Loader2 className="size-8 animate-spin text-primary mx-auto" />
                            <p className="text-xs font-bold">Building brief…</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function VideoCardSkeleton() {
    return (
        <div className="rounded-2xl border border-border/30 bg-card/20 overflow-hidden">
            <div className="aspect-video bg-muted/30 animate-pulse" />
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-muted/40 animate-pulse shrink-0" />
                    <div className="h-3.5 w-28 bg-muted/40 rounded animate-pulse" />
                </div>
                <div className="space-y-1.5">
                    <div className="h-3 w-full bg-muted/30 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-muted/30 rounded animate-pulse" />
                </div>
                <div className="flex gap-1.5">
                    {[1, 2, 3].map(i => <div key={i} className="h-5 w-14 bg-muted/20 rounded-full animate-pulse" />)}
                </div>
                <div className="h-9 w-full bg-muted/30 rounded-xl animate-pulse" />
            </div>
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DiscoveryStep({ onSelectBrief }: DiscoveryStepProps) {
    const [view, setView] = useState<DiscoveryView>("home")

    // ── Trend Explorer state ──
    const [trendQuery, setTrendQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [videos, setVideos] = useState<TikTokVideo[]>([])
    const [searchDone, setSearchDone] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
    const [isGeneratingFromVideo, setIsGeneratingFromVideo] = useState(false)

    // ── Idea Refiner state ──
    const [roughIdea, setRoughIdea] = useState("")
    const [refinePhase, setRefinePhase] = useState<1 | 2>(1)
    const [isRefining, setIsRefining] = useState(false)
    const [analysisTopic, setAnalysisTopic] = useState("")
    const [analysisAudience, setAnalysisAudience] = useState("")
    const [analysisAngle, setAnalysisAngle] = useState("")
    const [questions, setQuestions] = useState<Question[]>([])
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [refinedBrief, setRefinedBrief] = useState<RefinedBrief | null>(null)

    // ─── Trend Explorer handlers ───────────────────────────────────────────

    const handleTrendSearch = async (query?: string) => {
        const q = (query || trendQuery).trim()
        if (!q) return
        setIsSearching(true)
        setSearchDone(false)
        setSearchError(null)
        setVideos([])
        setSelectedVideoId(null)

        try {
            const res = await fetch(`/api/tiktok-search?q=${encodeURIComponent(q)}`)
            const data = await res.json()
            if (data.fallback) {
                setSearchError(data.message || "Could not reach TikTok data sources. Try again shortly.")
                setVideos([])
            } else {
                setVideos(data.items || [])
                if ((data.items || []).length === 0) {
                    setSearchError("No videos found for that topic. Try a different search term.")
                }
            }
        } catch {
            setSearchError("Network error. Please check your connection and try again.")
        } finally {
            setIsSearching(false)
            setSearchDone(true)
        }
    }

    const handleUseVideo = async (video: TikTokVideo) => {
        setSelectedVideoId(video.id)
        setIsGeneratingFromVideo(true)

        try {
            // Use the video metadata directly to build a brief — no extra credits
            const topHashtag = video.hashtags[0]?.replace("#", "") || trendQuery
            const industry = topHashtag.charAt(0).toUpperCase() + topHashtag.slice(1)

            // Small delay so the loading state is visible
            await new Promise(r => setTimeout(r, 600))

            onSelectBrief({
                industry,
                concept: video.desc || `Video by @${video.author.handle}`,
                hook: `Trending on TikTok: ${video.desc?.slice(0, 80) || "viral format"}`,
                idea: [
                    `Based on trending TikTok by @${video.author.handle}`,
                    video.desc,
                    `Stats: ${fmtNum(video.stats.plays)} plays, ${fmtNum(video.stats.likes)} likes`,
                    video.music.title ? `Music: ${video.music.title}` : "",
                    video.hashtags.length ? `Tags: ${video.hashtags.slice(0, 5).join(" ")}` : "",
                ].filter(Boolean).join("\n"),
            })
        } catch {
            toast.error("Failed to build brief from this video. Try another.")
            setSelectedVideoId(null)
        } finally {
            setIsGeneratingFromVideo(false)
        }
    }

    // ─── Idea Refiner handlers ─────────────────────────────────────────────

    const handleAnalyzeIdea = async () => {
        if (!roughIdea.trim()) return
        setIsRefining(true)

        try {
            const res = await fetch("/api/refine-idea", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idea: roughIdea, phase: 1 }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to analyze idea")
            setAnalysisTopic(data.topic || "")
            setAnalysisAudience(data.audience || "")
            setAnalysisAngle(data.angle || "")
            setQuestions(data.questions || [])
            setRefinePhase(2)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to analyze your idea. Please try again.")
        } finally {
            setIsRefining(false)
        }
    }

    const handleGenerateBrief = async () => {
        if (questions.some(q => !answers[q.id])) {
            toast.error("Please answer all questions before generating your brief.")
            return
        }
        setIsRefining(true)

        try {
            const res = await fetch("/api/refine-idea", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idea: roughIdea, phase: 2, answers }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate brief")
            setRefinedBrief(data)

            // Optionally trigger a TikTok search on the refined topic
            if (data.suggestedSearch) {
                setTrendQuery(data.suggestedSearch)
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to generate brief. Please try again.")
        } finally {
            setIsRefining(false)
        }
    }

    const handleUseBrief = () => {
        if (!refinedBrief) return
        onSelectBrief({
            industry: refinedBrief.industry || "Content Creation",
            concept: refinedBrief.concept || refinedBrief.titleVariations?.[0] || roughIdea.slice(0, 60),
            hook: refinedBrief.hook,
            idea: [
                roughIdea,
                `Script outline: ${refinedBrief.scriptOutline?.map(s => `${s.part}: ${s.description}`).join(" | ")}`,
                `Hashtags: ${refinedBrief.hashtags?.join(" ")}`,
            ].join("\n"),
            suggestedScript: refinedBrief.scriptOutline?.map(s => `${s.part}: ${s.description}`).join("\n"),
        })
    }

    const resetRefiner = () => {
        setRefinePhase(1)
        setRoughIdea("")
        setQuestions([])
        setAnswers({})
        setRefinedBrief(null)
        setAnalysisTopic("")
        setAnalysisAudience("")
        setAnalysisAngle("")
    }

    // ─── Render ────────────────────────────────────────────────────────────

    return (
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 animate-in fade-in duration-500">
            <AnimatePresence mode="wait">

                {/* ══ HOME ══ */}
                {view === "home" && (
                    <motion.div
                        key="home"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="py-12 space-y-10"
                    >
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest">
                                <Sparkles className="size-3.5" />
                                Content Intelligence
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-outfit bg-linear-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
                                Where do you want to start?
                            </h1>
                            <p className="text-muted-foreground text-base max-w-md mx-auto">
                                Find what's trending on TikTok, or let AI refine your own idea into a polished brief.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
                            <ModeCard
                                icon={TrendingUp}
                                title="Explore Trends"
                                description="Search TikTok by topic, browse real viral videos, and pick one to use as content inspiration."
                                cta="Browse trends"
                                accent="bg-primary/5"
                                onClick={() => setView("trends")}
                            />
                            <ModeCard
                                icon={Lightbulb}
                                title="Refine My Idea"
                                description="Got a rough concept? AI will ask the right questions and turn it into a high-converting content brief."
                                cta="Refine my idea"
                                accent="bg-accent/5"
                                onClick={() => setView("refine")}
                            />
                        </div>

                        <p className="text-center text-xs text-muted-foreground/40 font-medium">
                            Both modes feed directly into the video creation flow
                        </p>
                    </motion.div>
                )}

                {/* ══ TREND EXPLORER ══ */}
                {view === "trends" && (
                    <motion.div
                        key="trends"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="py-8 space-y-7"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setView("home")}
                                className="rounded-xl h-9 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
                            >
                                <ArrowLeft className="size-4" /> Back
                            </Button>
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <TrendingUp className="size-5 text-primary" />
                                    Trend Explorer
                                </h2>
                                <p className="text-xs text-muted-foreground">Search TikTok for real viral videos in any niche</p>
                            </div>
                        </div>

                        {/* Search bar */}
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder="Search TikTok (e.g. iced coffee, productivity hacks, gym motivation)"
                                    className="h-12 pl-11 rounded-2xl border-border/40 bg-card/50 text-base focus-visible:ring-primary/20 font-medium"
                                    value={trendQuery}
                                    onChange={e => setTrendQuery(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleTrendSearch()}
                                />
                            </div>
                            <Button
                                size="lg"
                                onClick={() => handleTrendSearch()}
                                disabled={isSearching || !trendQuery.trim()}
                                className="h-12 rounded-2xl px-6 font-bold shrink-0"
                            >
                                {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                                <span className="hidden sm:inline ml-2">Search</span>
                            </Button>
                        </div>

                        {/* Results */}
                        <AnimatePresence mode="wait">
                            {isSearching && (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
                                    </div>
                                </motion.div>
                            )}

                            {!isSearching && searchError && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-16 space-y-4 text-center"
                                >
                                    <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                                        <Search className="size-7 text-destructive/60" />
                                    </div>
                                    <p className="font-semibold text-muted-foreground">{searchError}</p>
                                    <Button variant="outline" size="sm" onClick={() => handleTrendSearch()} className="rounded-xl gap-2">
                                        <RefreshCw className="size-4" /> Try again
                                    </Button>
                                </motion.div>
                            )}

                            {!isSearching && !searchError && videos.length > 0 && (
                                <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            <span className="font-bold text-foreground">{videos.length}</span> videos found for <span className="font-bold text-primary">{trendQuery}</span>
                                        </p>
                                        <Button variant="ghost" size="sm" onClick={() => handleTrendSearch()} className="rounded-xl gap-1.5 text-muted-foreground">
                                            <RefreshCw className="size-3.5" /> Refresh
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {videos.map((video, i) => (
                                            <motion.div
                                                key={video.id}
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.04, duration: 0.25 }}
                                            >
                                                <VideoCard
                                                    video={video}
                                                    onUse={handleUseVideo}
                                                    isSelected={selectedVideoId === video.id}
                                                    isLoading={isGeneratingFromVideo}
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {!isSearching && !searchError && !searchDone && (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.4 }}
                                    className="flex flex-col items-center justify-center py-20 space-y-4 text-center"
                                >
                                    <TrendingUp className="size-16 text-primary" />
                                    <p className="text-xl font-bold">Search for any topic</p>
                                    <p className="text-muted-foreground text-sm">
                                        Enter a niche, product, or style — we'll find what's trending on TikTok right now.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ══ IDEA REFINER ══ */}
                {view === "refine" && (
                    <motion.div
                        key="refine"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="py-8 space-y-7"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setView("home"); resetRefiner() }}
                                className="rounded-xl h-9 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
                            >
                                <ArrowLeft className="size-4" /> Back
                            </Button>
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Lightbulb className="size-5 text-amber-500" />
                                    Idea Refiner
                                </h2>
                                <p className="text-xs text-muted-foreground">AI turns your rough concept into a polished content brief</p>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">

                            {/* Phase 1: Input */}
                            {refinePhase === 1 && !refinedBrief && (
                                <motion.div
                                    key="phase1"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.25 }}
                                    className="max-w-2xl mx-auto space-y-5"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold">Your rough idea</label>
                                        <p className="text-xs text-muted-foreground">The messier the better — describe it like you're texting a friend.</p>
                                    </div>
                                    <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
                                        <textarea
                                            value={roughIdea}
                                            onChange={e => setRoughIdea(e.target.value)}
                                            rows={5}
                                            placeholder="e.g. I want to make a video about how I went from making $0 to $5k/month selling digital products, but make it feel like I'm sharing a secret with a friend rather than bragging…"
                                            className="w-full bg-transparent p-4 text-base placeholder:text-muted-foreground/40 resize-none focus:outline-none font-medium leading-relaxed"
                                        />
                                        <div className="px-4 pb-3 flex items-center justify-between border-t border-border/20 pt-3">
                                            <span className="text-[10px] text-muted-foreground/40">
                                                {roughIdea.length} characters
                                            </span>
                                            <Button
                                                onClick={handleAnalyzeIdea}
                                                disabled={isRefining || roughIdea.trim().length < 10}
                                                size="sm"
                                                className="h-9 rounded-xl font-bold px-5"
                                            >
                                                {isRefining ? (
                                                    <><Loader2 className="size-3.5 animate-spin mr-1.5" />Analyzing…</>
                                                ) : (
                                                    <><Sparkles className="size-3.5 mr-1.5" />Analyze my idea</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-center text-muted-foreground/50">
                                        AI will identify your topic, audience, angle, and ask 2–3 clarifying questions
                                    </p>
                                </motion.div>
                            )}

                            {/* Phase 2: Questions */}
                            {refinePhase === 2 && !refinedBrief && questions.length > 0 && (
                                <motion.div
                                    key="phase2"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.25 }}
                                    className="max-w-2xl mx-auto space-y-6"
                                >
                                    {/* Analysis summary */}
                                    {(analysisTopic || analysisAudience || analysisAngle) && (
                                        <div className="rounded-2xl border border-border/40 bg-card/30 p-5 space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">AI Analysis</p>
                                            <div className="space-y-2">
                                                {analysisTopic && (
                                                    <div className="flex gap-2 text-sm">
                                                        <span className="font-bold text-muted-foreground/70 shrink-0 w-20">Topic</span>
                                                        <span>{analysisTopic}</span>
                                                    </div>
                                                )}
                                                {analysisAudience && (
                                                    <div className="flex gap-2 text-sm">
                                                        <span className="font-bold text-muted-foreground/70 shrink-0 w-20">Audience</span>
                                                        <span>{analysisAudience}</span>
                                                    </div>
                                                )}
                                                {analysisAngle && (
                                                    <div className="flex gap-2 text-sm">
                                                        <span className="font-bold text-muted-foreground/70 shrink-0 w-20">Angle</span>
                                                        <span>{analysisAngle}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Clarifying questions */}
                                    <div className="space-y-5">
                                        <div>
                                            <p className="font-bold text-sm">Quick questions to sharpen your brief</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Answer all {questions.length} to generate your brief</p>
                                        </div>
                                        {questions.map((q, qi) => (
                                            <div key={q.id} className="space-y-3">
                                                <div className="flex items-start gap-2">
                                                    <span className="mt-0.5 size-5 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                                                        {qi + 1}
                                                    </span>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{q.label}</p>
                                                        <p className="text-sm font-medium">{q.question}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 pl-7">
                                                    {q.options.map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                            className={cn(
                                                                "px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-150",
                                                                answers[q.id] === opt
                                                                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                                                                    : "bg-card/50 border-border/40 hover:border-primary/30 hover:bg-primary/5"
                                                            )}
                                                        >
                                                            {answers[q.id] === opt && <Check className="inline size-3.5 mr-1.5 -mt-0.5" />}
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setRefinePhase(1)}
                                            className="rounded-xl h-10 gap-1.5 text-muted-foreground"
                                        >
                                            <ArrowLeft className="size-4" /> Edit idea
                                        </Button>
                                        <Button
                                            onClick={handleGenerateBrief}
                                            disabled={isRefining || questions.some(q => !answers[q.id])}
                                            className="flex-1 h-10 rounded-xl font-bold"
                                        >
                                            {isRefining ? (
                                                <><Loader2 className="size-4 animate-spin mr-2" />Generating brief…</>
                                            ) : (
                                                <><Sparkles className="size-4 mr-2" />Generate content brief</>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Refined brief result */}
                            {refinedBrief && (
                                <motion.div
                                    key="brief"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="max-w-2xl mx-auto space-y-5"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="size-8 rounded-xl bg-primary/15 flex items-center justify-center">
                                                <Check className="size-4 text-primary" />
                                            </div>
                                            <p className="font-bold">Content Brief Ready</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={resetRefiner}
                                            className="rounded-xl h-8 text-muted-foreground text-xs gap-1.5"
                                        >
                                            <RefreshCw className="size-3.5" /> Start over
                                        </Button>
                                    </div>

                                    {/* Hook */}
                                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                            <Zap className="size-3" /> Hook
                                        </p>
                                        <p className="text-base font-bold leading-snug">{refinedBrief.hook}</p>
                                    </div>

                                    {/* Title variations */}
                                    {refinedBrief.titleVariations?.length > 0 && (
                                        <div className="rounded-2xl border border-border/40 bg-card/30 p-5 space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Title Variations</p>
                                            <div className="space-y-2">
                                                {refinedBrief.titleVariations.map((title, i) => (
                                                    <div key={i} className="flex items-start gap-2 text-sm">
                                                        <span className="size-5 rounded-full bg-muted/50 text-muted-foreground text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                                            {i + 1}
                                                        </span>
                                                        <span className="font-medium">{title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Script outline */}
                                    {refinedBrief.scriptOutline?.length > 0 && (
                                        <div className="rounded-2xl border border-border/40 bg-card/30 p-5 space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Script Outline</p>
                                            <div className="space-y-3">
                                                {refinedBrief.scriptOutline.map((scene, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <ChevronRight className="size-4 text-primary shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{scene.part}</p>
                                                            <p className="text-sm mt-0.5">{scene.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Meta row */}
                                    <div className="flex flex-wrap gap-3">
                                        {refinedBrief.videoLength && (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/30">
                                                <Clock className="size-3.5" />
                                                <span className="font-semibold">{refinedBrief.videoLength}</span>
                                            </div>
                                        )}
                                        {refinedBrief.hashtags?.slice(0, 5).map((tag, i) => (
                                            <span key={i} className="text-xs font-bold text-accent/80 bg-accent/5 border border-accent/15 px-3 py-1.5 rounded-xl">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Use brief CTA */}
                                    <Button
                                        onClick={handleUseBrief}
                                        className="w-full h-12 rounded-2xl font-bold text-base shadow-xl shadow-primary/20"
                                    >
                                        <ArrowRight className="size-5 mr-2" />
                                        Use this brief
                                    </Button>

                                    {refinedBrief.suggestedSearch && (
                                        <button
                                            onClick={() => { setView("trends"); setTrendQuery(refinedBrief.suggestedSearch!); handleTrendSearch(refinedBrief.suggestedSearch) }}
                                            className="w-full text-center text-xs text-muted-foreground/60 hover:text-primary transition-colors font-medium flex items-center justify-center gap-1.5"
                                        >
                                            <TrendingUp className="size-3.5" />
                                            See what&apos;s trending for &ldquo;{refinedBrief.suggestedSearch}&rdquo;
                                        </button>
                                    )}
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    )
}
