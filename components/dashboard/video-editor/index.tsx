"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Play,
    Pause,
    RotateCcw,
    Volume2,
    Music,
    Type,
    Scissors,
    Layers,
    Palette,
    Download,
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Trash2,
    Settings,
    Split,
    LayoutTemplate,
    Music2,
    Check,
    Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface VideoEditorProps {
    videoUrl: string
    initialCaptions?: string[]
    onExport: (finalVideoUrl: string) => void
    onClose: () => void
}

export function VideoEditor({ videoUrl, initialCaptions, onExport, onClose }: VideoEditorProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [activeTab, setActiveTab] = useState<"media" | "audio" | "text" | "filters">("media")
    const [isExporting, setIsExporting] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Editor state
    const [captions, setCaptions] = useState(() => {
        if (initialCaptions && initialCaptions.length > 0) {
            return initialCaptions.map((text, i) => ({
                id: i + 1,
                text,
                start: i * 3,
                end: (i + 1) * 3
            }))
        }
        return [
            { id: 1, text: "Wait for the view...", start: 0, end: 3 },
            { id: 2, text: "Modern Living Defined", start: 4, end: 8 }
        ]
    })
    const [selectedAudio, setSelectedAudio] = useState("Ambient Flow")

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause()
            else videoRef.current.play()
            setIsPlaying(!isPlaying)
        }
    }

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime)
        }
    }

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration)
        }
    }

    const seekTo = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time
            setCurrentTime(time)
        }
    }

    const handleExport = async () => {
        setIsExporting(true)
        // Simulate rendering
        await new Promise(r => setTimeout(r, 2000))
        setIsExporting(false)
        onExport(videoUrl)
    }

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500">
            {/* Top Bar */}
            <div className="h-14 border-b border-border/40 px-6 flex items-center justify-between bg-card/50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <ChevronLeft className="size-5" />
                    </Button>
                    <div className="h-4 w-px bg-border/40" />
                    <h2 className="font-bold tracking-tight">AI Content Designer</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 mr-2">
                        Wan AI 2.6 Flash • 4K
                    </Badge>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="rounded-full bg-primary font-bold shadow-lg shadow-primary/20"
                    >
                        {isExporting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Download className="size-4 mr-2" />}
                        {isExporting ? "Rendering..." : "Export Video"}
                    </Button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Navigation */}
                <div className="hidden md:flex w-20 border-r border-border/40 flex-col items-center py-6 gap-6 bg-card/30">
                    {[
                        { id: "media", icon: Layers, label: "Media" },
                        { id: "audio", icon: Music2, label: "Audio" },
                        { id: "text", icon: Type, label: "Text" },
                        { id: "filters", icon: Palette, label: "Adjust" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
                                activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <tab.icon className="size-6" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                        </button>
                    ))}
                    <div className="mt-auto">
                        <Button variant="ghost" size="icon" className="rounded-xl">
                            <Settings className="size-5 text-muted-foreground" />
                        </Button>
                    </div>
                </div>

                {/* Left Panel - Assets */}
                <div className="hidden lg:flex w-80 border-r border-border/40 bg-card/20 flex-col">
                    <div className="p-6 border-b border-border/40">
                        <h3 className="font-bold text-lg capitalize">{activeTab} Tools</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === "media" && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Auto Layout</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {["Fit", "Fill", "Pan", "Zoom"].map(l => (
                                            <div key={l} className="p-3 bg-card border border-border/40 rounded-xl text-center text-xs font-bold hover:border-primary/20 cursor-pointer">{l}</div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-border/40 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Branded Outro</p>
                                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <div className="size-4 rounded-full bg-primary" />
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col items-center gap-4 text-center">
                                        <div className="size-16 rounded-2xl bg-background border border-border/40 flex items-center justify-center shadow-lg">
                                            <span className="text-[10px] font-bold text-muted-foreground">LOGO</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">Adds your brand logo and tagline to the last 2 seconds.</p>
                                        <Button variant="outline" size="sm" className="rounded-full text-[10px] h-8 bg-background">Settings</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "audio" && (
                            <div className="space-y-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">AI Suggested Tracks</p>
                                {["Ambient Flow", "Tech Pulse", "Cinematic Rise", "Lo-Fi Focus"].map((track) => (
                                    <div
                                        key={track}
                                        onClick={() => setSelectedAudio(track)}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                                            selectedAudio === track ? "bg-primary/10 border-primary/30" : "bg-card border-border/40 hover:border-primary/20"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                                <Music className="size-5 text-primary" />
                                            </div>
                                            <div className="text-sm font-semibold">{track}</div>
                                        </div>
                                        {selectedAudio === track && <Check className="size-4 text-primary" />}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "text" && (
                            <div className="space-y-6">
                                <Button className="w-full rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold py-6">
                                    <Plus className="size-4 mr-2" /> Add New Text
                                </Button>
                                <div className="space-y-4">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Captions</p>
                                    {captions.map((cap) => (
                                        <div key={cap.id} className="p-4 rounded-2xl bg-card border border-border/40 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{cap.start}s - {cap.end}s</Badge>
                                                <Button variant="ghost" size="icon" className="size-6 h-6 w-6">
                                                    <Trash2 className="size-3 text-red-500" />
                                                </Button>
                                            </div>
                                            <textarea
                                                className="w-full bg-muted/40 border-none rounded-lg p-2 text-sm focus:ring-0 resize-none font-medium"
                                                value={cap.text}
                                                onChange={(e) => {
                                                    const newCaps = [...captions]
                                                    const target = newCaps.find(c => c.id === cap.id)
                                                    if (target) {
                                                        target.text = e.target.value
                                                        setCaptions(newCaps)
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "filters" && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        <span>Brightness</span>
                                        <span className="text-primary">0%</span>
                                    </div>
                                    <input type="range" defaultValue={50} max={100} step={1} className="w-full accent-primary" />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        <span>Contrast</span>
                                        <span className="text-primary">15%</span>
                                    </div>
                                    <input type="range" defaultValue={65} max={100} step={1} className="w-full accent-primary" />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        <span>Saturation</span>
                                        <span className="text-primary">10%</span>
                                    </div>
                                    <input type="range" defaultValue={60} max={100} step={1} className="w-full accent-primary" />
                                </div>

                                <div className="pt-4 space-y-4">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Color Presets</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {["Cinematic", "Noir", "Vintage", "Warm"].map(p => (
                                            <div key={p} className="aspect-square bg-muted rounded-xl border border-border/40 flex items-center justify-center hover:border-primary/40 cursor-pointer overflow-hidden relative group font-bold text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-all">
                                                {p}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Area - Preview */}
                <div className="flex-1 bg-black/60 flex flex-col items-center justify-center p-8 relative">
                    <div className="w-full h-full relative flex items-center justify-center">
                        <div className="aspect-9/16 h-full max-h-[700px] bg-black rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden relative border border-white/5 ring-1 ring-white/10">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className="w-full h-full object-cover"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                loop
                            />

                            {/* In-Video Overlay Mockup */}
                            <div className="absolute inset-0 pointer-events-none p-12 flex flex-col justify-end text-center">
                                {captions.map(cap => (
                                    currentTime >= cap.start && currentTime <= cap.end && (
                                        <motion.p
                                            key={cap.id}
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            className="text-white text-3xl font-bold drop-shadow-2xl font-outfit"
                                        >
                                            {cap.text}
                                        </motion.p>
                                    )
                                ))}
                            </div>

                            {/* Center Play Button Overlay */}
                            <AnimatePresence>
                                {!isPlaying && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] cursor-pointer"
                                        onClick={togglePlay}
                                    >
                                        <div className="size-20 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center scale-110">
                                            <Play className="size-10 text-white fill-white ml-1" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Floating Video Controls */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-card/80 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-2xl">
                        <Button variant="ghost" size="icon" onClick={() => seekTo(0)} className="rounded-full text-white hover:text-primary">
                            <RotateCcw className="size-5" />
                        </Button>
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={togglePlay}
                                className="size-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                            >
                                {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current ml-1" />}
                            </Button>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-3 min-w-[100px] text-xs font-bold text-white uppercase tracking-widest font-mono">
                            <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                            <span className="text-white/40">/</span>
                            <span className="text-white/40">{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <Volume2 className="size-5 text-white/60 group-hover:text-white transition-colors" />
                            <div className="w-20 hidden md:block">
                                <input type="range" defaultValue={80} max={100} step={1} className="w-full accent-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Timeline */}
            <div className="h-48 border-t border-border/40 bg-card/50 flex flex-col">
                <div className="h-10 border-b border-border/40 px-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Split className="size-3" /> <span>Split Tool</span>
                        </div>
                        <div className="flex items-center gap-2 hover:text-foreground cursor-pointer transition-colors">
                            <Scissors className="size-3" /> <span>Trim Start</span>
                        </div>
                        <div className="flex items-center gap-2 hover:text-foreground cursor-pointer transition-colors">
                            <X className="size-3" /> <span>Clear All</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <LayoutTemplate className="size-3" /> <span>Ratio: 9:16</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-primary animate-pulse" /> Live Rendering
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative overflow-hidden flex items-center px-24">
                    {/* Time Indicator Marker */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all ease-linear"
                        style={{ left: `calc(6rem + ${(currentTime / (duration || 1)) * (100 - 12)}%)` }}
                    >
                        <div className="absolute top-0 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-sm">
                            {new Date(currentTime * 1000).toISOString().substr(17, 4)}
                        </div>
                    </div>

                    <div className="w-full space-y-2">
                        {/* Text Track */}
                        <div className="h-8 w-full bg-blue-500/5 rounded-md border border-blue-500/10 relative overflow-hidden group">
                            <div className="absolute -left-20 h-full flex items-center text-[10px] font-bold text-blue-500/40 uppercase pl-4">Caption</div>
                            {captions.map(cap => (
                                <div
                                    key={cap.id}
                                    className="absolute h-full bg-blue-500/20 border-x border-blue-500/40 flex items-center px-2 text-[10px] font-bold text-blue-500 truncate cursor-pointer hover:bg-blue-500/30 transition-colors"
                                    style={{
                                        left: `${(cap.start / (duration || 1)) * 100}%`,
                                        width: `${((cap.end - cap.start) / (duration || 1)) * 100}%`
                                    }}
                                    onClick={() => seekTo(cap.start)}
                                >
                                    {cap.text}
                                </div>
                            ))}
                        </div>

                        {/* Video Track */}
                        <div className="h-16 w-full bg-primary/5 rounded-md border border-primary/20 relative overflow-hidden">
                            <div className="absolute -left-20 h-full flex items-center text-[10px] font-bold text-primary/40 uppercase pl-4">Video</div>
                            <div className="h-full w-full bg-[linear-gradient(90deg,transparent_0,transparent_99%,rgba(255,255,255,0.05)_100%)] bg-size-[2s_100%] absolute inset-0" />
                            {/* Simplified Visual Thumbnails Representation */}
                            <div className="flex h-full w-full gap-0.5 opacity-30">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className="flex-1 bg-muted/50 border-r border-background/20" />
                                ))}
                            </div>
                        </div>

                        {/* Audio Track */}
                        <div className="h-8 w-full bg-emerald-500/5 rounded-md border border-emerald-500/10 relative overflow-hidden">
                            <div className="absolute -left-20 h-full flex items-center text-[10px] font-bold text-emerald-500/40 uppercase pl-4">Audio</div>
                            <div
                                className="absolute h-full bg-emerald-500/20 border-x border-emerald-500/40 flex items-center px-4 text-[10px] font-bold text-emerald-500 truncate"
                                style={{ left: '0', width: '100%' }}
                            >
                                <Music className="size-3 mr-2" /> {selectedAudio}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
