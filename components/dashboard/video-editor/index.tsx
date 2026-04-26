"use client"

import { useState, useRef, useCallback } from "react"
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
    Plus,
    X,
    Trash2,
    Settings,
    Split,
    LayoutTemplate,
    Music2,
    Check,
    Loader2,
    VolumeX
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

const TOOL_TABS = [
    { id: "media", icon: Layers, label: "Media" },
    { id: "audio", icon: Music2, label: "Audio" },
    { id: "text", icon: Type, label: "Text" },
    { id: "filters", icon: Palette, label: "Adjust" },
] as const

type TabId = typeof TOOL_TABS[number]["id"]

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const cs = Math.floor((seconds % 1) * 10)
    return `${m}:${s.toString().padStart(2, "0")}.${cs}`
}

export function VideoEditor({ videoUrl, initialCaptions, onExport, onClose }: VideoEditorProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [activeTab, setActiveTab] = useState<TabId>("media")
    const [isExporting, setIsExporting] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [volume, setVolume] = useState(80)
    const videoRef = useRef<HTMLVideoElement>(null)
    const timelineRef = useRef<HTMLDivElement>(null)

    const [brightness, setBrightness] = useState(50)
    const [contrast, setContrast] = useState(65)
    const [saturation, setSaturation] = useState(60)

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

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause()
            else videoRef.current.play()
            setIsPlaying(!isPlaying)
        }
    }, [isPlaying])

    const handleTimeUpdate = () => {
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
    }

    const handleLoadedMetadata = () => {
        if (videoRef.current) setDuration(videoRef.current.duration)
    }

    const seekTo = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time
            setCurrentTime(time)
        }
    }

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current || !duration) return
        const rect = timelineRef.current.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        seekTo(ratio * duration)
    }

    const handleExport = async () => {
        setIsExporting(true)
        await new Promise(r => setTimeout(r, 2000))
        setIsExporting(false)
        onExport(videoUrl)
    }

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted
            setIsMuted(!isMuted)
        }
    }

    const handleVolumeChange = (val: number) => {
        setVolume(val)
        if (videoRef.current) {
            videoRef.current.volume = val / 100
            if (val === 0) setIsMuted(true)
            else if (isMuted) {
                setIsMuted(false)
                videoRef.current.muted = false
            }
        }
    }

    const progressPct = duration ? (currentTime / duration) * 100 : 0

    return (
        <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">

            {/* ── Top Bar ── */}
            <div className="h-14 border-b border-border/40 px-4 flex items-center justify-between bg-card/50 shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-9 w-9" aria-label="Close editor">
                        <ChevronLeft className="size-5" />
                    </Button>
                    <div className="h-4 w-px bg-border/40" />
                    <h2 className="font-bold text-sm tracking-tight">AI Content Designer</h2>
                    <Badge variant="outline" className="hidden sm:flex bg-primary/5 text-primary border-primary/20 text-[10px] font-bold">
                        Wan AI 2.6 · 4K
                    </Badge>
                </div>
                <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    size="sm"
                    className="rounded-xl bg-primary font-bold shadow-lg shadow-primary/20 h-9"
                >
                    {isExporting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Download className="size-4 mr-2" />}
                    {isExporting ? "Rendering…" : "Export"}
                </Button>
            </div>

            {/* ── Main Area ── */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* Left: Tool icon rail */}
                <div className="hidden md:flex w-16 border-r border-border/40 flex-col items-center py-4 gap-1 bg-card/30 shrink-0">
                    {TOOL_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            aria-label={tab.label}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 w-12 rounded-xl transition-all duration-150",
                                activeTab === tab.id
                                    ? "bg-primary/15 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <tab.icon className="size-5" />
                            <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{tab.label}</span>
                        </button>
                    ))}
                    <div className="mt-auto">
                        <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10">
                            <Settings className="size-4 text-muted-foreground" />
                        </Button>
                    </div>
                </div>

                {/* Left: Tool panel */}
                <div className="hidden lg:flex w-72 border-r border-border/40 bg-card/20 flex-col shrink-0">
                    <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
                        <h3 className="font-bold text-sm capitalize">{activeTab}</h3>
                        <span className="text-[10px] text-muted-foreground/60 font-medium">Tools</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">

                        {/* ── Media Tab ── */}
                        {activeTab === "media" && (
                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Auto Layout</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {["Fit", "Fill", "Pan", "Zoom"].map(l => (
                                            <button
                                                key={l}
                                                className="p-3 bg-card border border-border/40 rounded-xl text-center text-xs font-bold hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-border/40 space-y-3">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Branded Outro</p>
                                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/15 flex flex-col items-center gap-3 text-center">
                                        <div className="size-14 rounded-xl bg-background border border-border/40 flex items-center justify-center shadow-md">
                                            <span className="text-[10px] font-bold text-muted-foreground">LOGO</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">Adds your brand logo and tagline to the final 2 seconds.</p>
                                        <Button variant="outline" size="sm" className="rounded-lg text-[10px] h-7 bg-background px-3">Configure</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Audio Tab ── */}
                        {activeTab === "audio" && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Suggested Tracks</p>
                                {["Ambient Flow", "Tech Pulse", "Cinematic Rise", "Lo-Fi Focus"].map((track) => (
                                    <button
                                        key={track}
                                        onClick={() => setSelectedAudio(track)}
                                        className={cn(
                                            "w-full p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left",
                                            selectedAudio === track
                                                ? "bg-primary/10 border-primary/30"
                                                : "bg-card border-border/40 hover:border-primary/20 hover:bg-card/80"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "size-9 rounded-lg flex items-center justify-center shrink-0",
                                                selectedAudio === track ? "bg-primary/20" : "bg-muted/50"
                                            )}>
                                                <Music className={cn("size-4", selectedAudio === track ? "text-primary" : "text-muted-foreground")} />
                                            </div>
                                            <span className="text-sm font-semibold">{track}</span>
                                        </div>
                                        {selectedAudio === track && <Check className="size-4 text-primary shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Text/Captions Tab ── */}
                        {activeTab === "text" && (
                            <div className="space-y-4">
                                <Button
                                    className="w-full rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold h-10"
                                    variant="ghost"
                                >
                                    <Plus className="size-4 mr-2" /> Add Caption
                                </Button>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Captions</p>
                                    {captions.map((cap) => (
                                        <div key={cap.id} className="rounded-xl bg-card border border-border/40 overflow-hidden">
                                            <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/30">
                                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                                                    {cap.start}s – {cap.end}s
                                                </Badge>
                                                <button
                                                    aria-label="Delete caption"
                                                    className="rounded-lg p-1 hover:bg-destructive/10 transition-colors"
                                                >
                                                    <Trash2 className="size-3 text-destructive/60" />
                                                </button>
                                            </div>
                                            <div className="p-2">
                                                <textarea
                                                    className="w-full bg-transparent border-none rounded-lg p-1.5 text-sm focus:ring-0 resize-none font-medium min-h-[56px] placeholder:text-muted-foreground/40 focus:outline-none"
                                                    value={cap.text}
                                                    onChange={(e) => {
                                                        const newCaps = captions.map(c =>
                                                            c.id === cap.id ? { ...c, text: e.target.value } : c
                                                        )
                                                        setCaptions(newCaps)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Filters Tab ── */}
                        {activeTab === "filters" && (
                            <div className="space-y-6">
                                {[
                                    { label: "Brightness", value: brightness, onChange: setBrightness, displayVal: `${Math.round((brightness - 50) * 2)}%` },
                                    { label: "Contrast", value: contrast, onChange: setContrast, displayVal: `${Math.round((contrast - 50) * 2)}%` },
                                    { label: "Saturation", value: saturation, onChange: setSaturation, displayVal: `${Math.round((saturation - 50) * 2)}%` },
                                ].map(({ label, value, onChange, displayVal }) => (
                                    <div key={label} className="space-y-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                                            <span className="text-xs font-bold text-primary tabular-nums">{displayVal}</span>
                                        </div>
                                        <input
                                            type="range"
                                            value={value}
                                            onChange={e => onChange(Number(e.target.value))}
                                            max={100}
                                            step={1}
                                            className="w-full accent-primary h-1.5 cursor-pointer"
                                        />
                                    </div>
                                ))}

                                <div className="pt-2 space-y-3">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Color Presets</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {["Cinematic", "Noir", "Vintage", "Warm"].map(p => (
                                            <button
                                                key={p}
                                                className="py-3 bg-muted/40 rounded-xl border border-border/40 flex items-center justify-center hover:border-primary/30 hover:bg-primary/5 cursor-pointer font-bold text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-all"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Center: Video Preview ── */}
                <div className="flex-1 bg-black/50 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
                    {/* Video frame */}
                    <div className="relative flex items-center justify-center w-full h-full">
                        <div className="aspect-[9/16] h-full max-h-[620px] max-w-[350px] w-full bg-black rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden border border-white/5 ring-1 ring-white/10">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className="w-full h-full object-cover"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={() => setIsPlaying(false)}
                                loop
                                playsInline
                            />

                            {/* Caption overlay */}
                            <div className="absolute inset-0 pointer-events-none flex flex-col justify-end pb-12 px-6 text-center">
                                {captions.map(cap =>
                                    currentTime >= cap.start && currentTime <= cap.end ? (
                                        <motion.p
                                            key={cap.id}
                                            initial={{ opacity: 0, scale: 0.92, y: 8 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.18 }}
                                            className="text-white text-2xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] font-outfit leading-tight"
                                            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
                                        >
                                            {cap.text}
                                        </motion.p>
                                    ) : null
                                )}
                            </div>

                            {/* Play/pause overlay */}
                            <AnimatePresence>
                                {!isPlaying && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] cursor-pointer"
                                        onClick={togglePlay}
                                    >
                                        <div className="size-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                                            <Play className="size-8 text-white fill-white ml-1" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Floating controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-card/80 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
                        <button
                            onClick={() => seekTo(0)}
                            aria-label="Restart"
                            className="rounded-xl p-2 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <RotateCcw className="size-4" />
                        </button>

                        <button
                            onClick={togglePlay}
                            aria-label={isPlaying ? "Pause" : "Play"}
                            className="size-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center shadow-md transition-all"
                        >
                            {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-0.5" />}
                        </button>

                        <div className="h-4 w-px bg-white/10" />

                        <div className="font-mono text-xs font-bold text-white/80 tabular-nums min-w-[80px]">
                            <span>{formatTime(currentTime)}</span>
                            <span className="text-white/30 mx-1">/</span>
                            <span className="text-white/40">{formatTime(duration)}</span>
                        </div>

                        <div className="h-4 w-px bg-white/10 hidden md:block" />

                        <div className="hidden md:flex items-center gap-2">
                            <button onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"} className="text-white/60 hover:text-white transition-colors p-1">
                                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                            </button>
                            <input
                                type="range"
                                value={isMuted ? 0 : volume}
                                onChange={e => handleVolumeChange(Number(e.target.value))}
                                max={100}
                                step={1}
                                className="w-16 accent-white h-1 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom Timeline ── */}
            <div className="border-t border-border/40 bg-card/50 shrink-0">
                {/* Timeline toolbar */}
                <div className="h-9 border-b border-border/30 px-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/10">
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors">
                            <Split className="size-3" /> Split
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors">
                            <Scissors className="size-3" /> Trim
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors">
                            <X className="size-3" /> Clear
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-1.5">
                            <LayoutTemplate className="size-3" /> 9:16
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                            Live
                        </div>
                    </div>
                </div>

                {/* Seekable progress bar */}
                <div
                    ref={timelineRef}
                    className="h-1.5 w-full bg-border/30 cursor-pointer group relative"
                    onClick={handleTimelineClick}
                    role="slider"
                    aria-label="Video progress"
                    aria-valuenow={Math.round(progressPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowRight") seekTo(Math.min(duration, currentTime + 1))
                        if (e.key === "ArrowLeft") seekTo(Math.max(0, currentTime - 1))
                    }}
                >
                    <div
                        className="h-full bg-primary transition-all ease-linear"
                        style={{ width: `${progressPct}%` }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 size-3 bg-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ left: `calc(${progressPct}% - 6px)` }}
                    />
                </div>

                {/* Tracks */}
                <div className="relative h-36 overflow-hidden">
                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-primary z-30 pointer-events-none"
                        style={{ left: `${progressPct}%` }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap -translate-y-full">
                            {formatTime(currentTime)}
                        </div>
                    </div>

                    <div className="h-full flex flex-col justify-center gap-2 py-3 px-4">
                        {/* Caption track */}
                        <div className="flex items-center gap-2">
                            <span className="w-16 text-[9px] font-bold uppercase tracking-wider text-blue-500/60 text-right shrink-0">Caption</span>
                            <div className="flex-1 h-7 bg-blue-500/5 rounded border border-blue-500/10 relative overflow-hidden">
                                {captions.map(cap => (
                                    <button
                                        key={cap.id}
                                        className="absolute h-full bg-blue-500/20 border-x border-blue-500/40 flex items-center px-2 text-[10px] font-bold text-blue-400 truncate cursor-pointer hover:bg-blue-500/30 transition-colors"
                                        style={{
                                            left: `${(cap.start / (duration || 1)) * 100}%`,
                                            width: `${Math.max(2, ((cap.end - cap.start) / (duration || 1)) * 100)}%`
                                        }}
                                        onClick={() => seekTo(cap.start)}
                                    >
                                        {cap.text}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Video track */}
                        <div className="flex items-center gap-2">
                            <span className="w-16 text-[9px] font-bold uppercase tracking-wider text-primary/50 text-right shrink-0">Video</span>
                            <div className="flex-1 h-14 bg-primary/5 rounded border border-primary/20 relative overflow-hidden">
                                <div className="flex h-full w-full gap-px">
                                    {Array.from({ length: 16 }).map((_, i) => (
                                        <div key={i} className="flex-1 bg-muted/30 border-r border-background/20 last:border-0" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Audio track */}
                        <div className="flex items-center gap-2">
                            <span className="w-16 text-[9px] font-bold uppercase tracking-wider text-emerald-500/60 text-right shrink-0">Audio</span>
                            <div className="flex-1 h-7 bg-emerald-500/5 rounded border border-emerald-500/10 relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center px-3 text-[10px] font-bold text-emerald-400 truncate gap-2">
                                    <Music className="size-3 shrink-0" />
                                    {selectedAudio}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
