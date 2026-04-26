"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
    Mic,
    Square,
    Play,
    Trash2,
    ShieldCheck,
    Sparkles,
    Volume2,
    ArrowRight,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const SAMPLE_TEXT = "Beyond Social Media Marketing is the future of content creation. I am recording my voice so that AI can generate high-fidelity videos that sound exactly like me. This process is secure and encrypted."

export default function VoiceClonePage() {
    const [isRecording, setIsRecording] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [status, setStatus] = useState<"idle" | "recording" | "completed" | "uploading" | "ready">("idle")
    const [progress, setProgress] = useState(0)
    const mediaRecorder = useRef<MediaRecorder | null>(null)

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            const chunks: BlobPart[] = []

            recorder.ondataavailable = (e) => chunks.push(e.data)
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" })
                setAudioUrl(URL.createObjectURL(blob))
                setStatus("completed")
            }

            recorder.start()
            mediaRecorder.current = recorder
            setIsRecording(true)
            setStatus("recording")

            // Simulating progress based on text length
            let p = 0
            const interval = setInterval(() => {
                p += 5
                if (p > 100) clearInterval(interval)
                setProgress(Math.min(p, 100))
            }, 500)
        } catch (err) {
            console.error(err)
        }
    }

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop()
            setIsRecording(false)
        }
    }

    const handleClone = async () => {
        setStatus("uploading")
        // Simulating AI processing
        for (let i = 0; i <= 100; i += 10) {
            setProgress(i)
            await new Promise(r => setTimeout(r, 400))
        }
        setStatus("ready")
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="space-y-4">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-xs">
                    New Feature • Beta
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight font-outfit">Clone Your Voice</h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Create a digital twin of your voice. Use it to narrate your AI-generated videos with perfect tone and emotion.
                </p>
            </div>

            <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
                {/* Main Action Area */}
                <Card className="border-border/40 bg-card/40 backdrop-blur-sm rounded-[32px] overflow-hidden shadow-2xl shadow-primary/5">
                    <CardContent className="p-8 space-y-8">
                        {status === "ready" ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center py-12 space-y-6"
                            >
                                <div className="size-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20">
                                    <ShieldCheck className="size-12 text-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-bold">Voice Model Ready</h3>
                                    <p className="text-muted-foreground">Your cloned voice will now be the default for all future videos.</p>
                                </div>
                                <div className="flex justify-center gap-4 pt-4">
                                    <Button variant="outline" className="rounded-full px-8" onClick={() => setStatus("idle")}>
                                        Re-record
                                    </Button>
                                    <Button className="rounded-full px-8 bg-primary">
                                        Test Generator <Sparkles className="size-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Reading Script</p>
                                        {isRecording && (
                                            <span className="flex items-center gap-2 text-red-500 text-xs font-bold animate-pulse">
                                                <div className="size-2 rounded-full bg-red-500" /> LIVE RECORDING
                                            </span>
                                        )}
                                    </div>
                                    <div className={cn(
                                        "p-8 rounded-2xl bg-background/50 border border-border/40 text-xl font-medium leading-relaxed transition-all",
                                        isRecording && "border-primary/40 shadow-inner ring-1 ring-primary/20"
                                    )}>
                                        &quot;{SAMPLE_TEXT}&quot;
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-center gap-6">
                                        <Button
                                            size="icon"
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={cn(
                                                "size-20 rounded-full transition-all duration-500",
                                                isRecording ? "bg-red-500 hover:bg-red-600 scale-110 shadow-xl shadow-red-500/20" : "bg-primary hover:bg-primary/90"
                                            )}
                                        >
                                            {isRecording ? <Square className="size-8 fill-white" /> : <Mic className="size-10" />}
                                        </Button>
                                    </div>

                                    {audioUrl && !isRecording && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col items-center gap-4 pt-4"
                                        >
                                            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-full border border-border/40">
                                                <Button size="icon" variant="ghost" className="rounded-full">
                                                    <Play className="size-4 fill-current" />
                                                </Button>
                                                <div className="w-48 h-12 flex items-center justify-center font-mono text-xs opacity-40">
                                                    Waveform Preview
                                                </div>
                                                <Button size="icon" variant="ghost" onClick={() => setAudioUrl(null)} className="rounded-full text-red-500">
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                            <Button
                                                onClick={handleClone}
                                                className="w-full h-14 rounded-full bg-foreground text-background font-bold text-lg"
                                            >
                                                Start Processing Clone <ArrowRight className="size-5 ml-2" />
                                            </Button>
                                        </motion.div>
                                    )}

                                    {status === "uploading" && (
                                        <div className="space-y-4 pt-4">
                                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                                                <span className="text-primary animate-pulse font-bold">Training AI Model...</span>
                                                <span className="text-muted-foreground">{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-2" />
                                            <p className="text-center text-xs text-muted-foreground">Analyzing harmonics and vocal patterns.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="border-border/40 bg-primary/5 rounded-3xl overflow-hidden shadow-none">
                        <CardContent className="p-6 space-y-4">
                            <h4 className="font-bold flex items-center gap-2">
                                <ShieldCheck className="size-4 text-primary" /> Privacy First
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Your voice data is encrypted and used only for your account. We never share your biometric data with third parties.
                            </p>
                        </CardContent>
                    </Card>

                    <div className="p-6 rounded-3xl bg-card border border-border/40 space-y-6">
                        <h4 className="font-bold uppercase tracking-widest text-xs text-muted-foreground">How it works</h4>
                        <div className="space-y-6">
                            {[
                                { title: "Capture", text: "Record 15 seconds of clean audio reading the provided script.", icon: Mic },
                                { title: "Analyze", text: "Our AI extracts your unique pitch, tone, and pacing.", icon: Volume2 },
                                { title: "Synthesize", text: "New voice models are generated within 2-3 minutes.", icon: Sparkles },
                            ].map((s, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="size-8 rounded-lg bg-background border border-border/60 flex items-center justify-center shrink-0">
                                        <s.icon className="size-4 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold">{s.title}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                        <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">
                            Ensure you are in a quiet room for best results. Background noise can degrade voice quality.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
