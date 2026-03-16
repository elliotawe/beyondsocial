"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Search,
    Sparkles,
    Play,
    Check,
    Loader2,
    TrendingUp,
    MessageSquare,
    Heart,
    Eye,
    X,
    Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getTrendingVideos, getConceptFromTrendingVideo } from "@/app/actions/discovery"
import type { TrendingVideo } from "@/lib/discovery-service"
import { cn } from "@/lib/utils"

const INDUSTRIES = [
    "Real Estate", "Tech", "Fashion", "Food & Beverage", "Fitness", "Beauty", "Finance", "Gaming", "Travel"
]

interface DiscoveryStepProps {
    onSelectBrief: (brief: { industry: string; concept: string; hook: string; idea: string; suggestedScript?: string }) => void
}

export function DiscoveryStep({ onSelectBrief }: DiscoveryStepProps) {
    const [industry, setIndustry] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [videos, setVideos] = useState<TrendingVideo[]>([])
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
    const [isExtracting, setIsExtracting] = useState(false)

    const handleSearch = async (query: string) => {
        const target = query || industry
        if (!target) return

        setIsSearching(true)
        try {
            const results = await getTrendingVideos(target)
            setVideos(results)
        } catch (err) {
            console.error(err)
        } finally {
            setIsSearching(false)
        }
    }

    const handleSelectVideo = async (video: TrendingVideo) => {
        setSelectedVideoId(video.id)
        setIsExtracting(true)
        try {
            const extraction = await getConceptFromTrendingVideo(video)
            onSelectBrief({
                industry: industry,
                concept: extraction.concept,
                hook: extraction.hook,
                idea: video.metadata.caption,
                suggestedScript: extraction.suggestedScript
            })
        } catch (err) {
            console.error(err)
        } finally {
            setIsExtracting(false)
        }
    }

    return (
        <div className="w-full max-w-5xl mx-auto space-y-12 py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="text-center space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-outfit bg-linear-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
                    What are we building today?
                </h1>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                    Select your industry to discover what&apos;s trending on TikTok and Instagram right now.
                </p>
            </div>

            {/* Industry Selection */}
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                    <div className="relative w-full max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Type your industry (e.g. Sustainable Fashion)"
                            className="h-14 pl-12 rounded-2xl border-border/40 bg-card/50 backdrop-blur-sm text-lg focus-visible:ring-primary/20 transition-all"
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(industry)}
                        />
                    </div>
                    <Button
                        size="lg"
                        onClick={() => handleSearch(industry)}
                        className="h-14 rounded-2xl px-8 font-bold shadow-xl shadow-primary/20"
                        disabled={isSearching || !industry}
                    >
                        {isSearching ? <Loader2 className="size-5 animate-spin mr-2" /> : <TrendingUp className="size-5 mr-2" />}
                        Find Trends
                    </Button>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    {INDUSTRIES.map((ind) => (
                        <Button
                            key={ind}
                            variant={industry === ind ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                setIndustry(ind)
                                handleSearch(ind)
                            }}
                            className="rounded-full px-4 h-9 text-xs font-bold transition-all hover:scale-105"
                        >
                            {ind}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Results Grid */}
            <AnimatePresence mode="wait">
                {isSearching ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-20 space-y-4"
                    >
                        <Loader2 className="size-12 text-primary animate-spin" />
                        <p className="text-muted-foreground font-medium animate-pulse">Scanning social trends for {industry}...</p>
                    </motion.div>
                ) : videos.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        <div className="flex items-center justify-between border-b border-border/40 pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <TrendingUp className="size-5 text-primary" />
                                Trending in {industry}
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Filter className="size-3" />
                                Ranked by Engagement
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {videos.map((video) => (
                                <Card
                                    key={video.id}
                                    className={cn(
                                        "group relative overflow-hidden rounded-[24px] border-border/40 bg-card transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer",
                                        selectedVideoId === video.id && "ring-2 ring-primary border-transparent shadow-2xl shadow-primary/20"
                                    )}
                                    onClick={() => handleSelectVideo(video)}
                                >
                                    <div className="aspect-9/16 relative bg-muted flex items-center justify-center">
                                        {playingVideoId === video.id ? (
                                            <video
                                                src={video.videoUrl}
                                                autoPlay
                                                controls
                                                className="w-full h-full object-cover"
                                                onEnded={() => setPlayingVideoId(null)}
                                            />
                                        ) : (
                                            <>
                                                <img
                                                    src={video.thumbnailUrl}
                                                    className="w-full h-full object-cover grayscale-[0.2] transition-all group-hover:scale-105 group-hover:grayscale-0"
                                                    alt={video.title}
                                                />
                                                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-primary uppercase tracking-widest">{video.metadata.author}</p>
                                                        <p className="text-lg font-bold text-white leading-tight line-clamp-2">{video.title}</p>
                                                    </div>
                                                </div>
                                                <div
                                                    className="absolute inset-0 flex items-center justify-center z-10"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setPlayingVideoId(video.id)
                                                    }}
                                                >
                                                    <div className="size-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-primary transition-all duration-300">
                                                        <Play className="size-6 text-white fill-white ml-1" />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Engagement Stats Overlay */}
                                        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                                            <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-none text-white gap-1 py-1">
                                                <Eye className="size-3" /> {(video.engagement.views / 1000).toFixed(0)}k
                                            </Badge>
                                            <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-none text-white gap-1 py-1">
                                                <Heart className="size-3" /> {(video.engagement.likes / 1000).toFixed(0)}k
                                            </Badge>
                                            <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-none text-white gap-1 py-1">
                                                <MessageSquare className="size-3" /> {video.engagement.comments}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Extraction Selection State */}
                                    <AnimatePresence>
                                        {selectedVideoId === video.id && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 bg-primary/95 flex flex-col items-center justify-center p-8 text-center text-primary-foreground z-30"
                                            >
                                                {isExtracting ? (
                                                    <div className="space-y-4">
                                                        <Loader2 className="size-12 animate-spin mx-auto" />
                                                        <p className="text-xl font-bold">Extracting Concept...</p>
                                                        <p className="text-sm opacity-80">AI is analyzing the hook and creative brief.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        <div className="size-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                                                            <Check className="size-10" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-2xl font-bold">Concept Extracted</p>
                                                            <div className="bg-black/20 p-4 rounded-xl text-left border border-white/10 backdrop-blur-sm">
                                                                <p className="text-xs font-bold text-primary-foreground/60 uppercase tracking-widest mb-1">Hook</p>
                                                                <p className="text-sm font-medium mb-3">"{video.metadata.caption?.substring(0, 100)}..."</p>
                                                                <p className="text-xs font-bold text-primary-foreground/60 uppercase tracking-widest mb-1">Concept</p>
                                                                <p className="text-sm font-medium line-clamp-2">AI will recreate: {video.title}</p>
                                                            </div>
                                                        </div>
                                                        <Button variant="secondary" className="rounded-full px-8 font-bold">
                                                            Start Generation
                                                        </Button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
                        <Sparkles className="size-20 mb-4" />
                        <p className="text-lg font-medium">Select an industry to see trends</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
