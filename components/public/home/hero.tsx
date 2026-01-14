"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Hero() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background/50 to-background flex flex-col items-center justify-center px-6 py-20">
            <div className="max-w-4xl w-full mx-auto space-y-12 my-12">

                {/* Headline & Subheader */}
                <div className="space-y-6 text-center">
                    <h1 className="text-5xl md:text-7xl font-bold text-balance leading-tight">
                        Create social videos effortlessly with AI
                    </h1>
                    <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
                        Chat with our AI assistant to generate, edit, and schedule social videos in minutes. No video editing skills
                        required.
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                    <Button size="lg" className="gap-2 bg-white text-black hover:bg-gray-100 text-base h-12 px-8 hover:text-white" asChild>
                        <Link href="/login">
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </Button>
                    {/* <Button variant="outline" size="lg" className="gap-2 text-base h-12 px-8 bg-transparent">
                        Watch Demo
                    </Button> */}
                </div>

                {/* Dashboard Preview */}
                <div className="pt-12">
                    <div className="relative bg-gradient-to-b from-secondary/50 via-secondary/30 to-background rounded-2xl border border-border/40 overflow-hidden shadow-2xl">
                        {/* Dashboard mockup */}
                        <div className="aspect-video bg-gradient-to-br from-secondary/40 via-background to-secondary/20 p-8 flex flex-col">
                            <div className="flex gap-2 mb-6">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>

                            <div className="grid grid-cols-3 gap-6 flex-1">
                                {/* Chat Panel */}
                                <div className="col-span-2 border-r border-border/40 pr-6 space-y-4">
                                    <div className="space-y-3">
                                        <div className="bg-secondary/50 rounded-lg p-4 w-3/4">
                                            <p className="text-sm text-muted-foreground">Create a viral dance video with trending audio...</p>
                                        </div>
                                        <div className="bg-secondary/80 rounded-lg p-4 ml-auto w-2/3">
                                            <p className="text-sm text-secondary-foreground">✓ Generating video with trending music</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-border/40">
                                        <input
                                            type="text"
                                            placeholder="Describe the video you want..."
                                            className="w-full bg-secondary/40 border border-border/40 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Video Preview Panel */}
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold text-foreground">Generated Video</div>
                                    <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-lg aspect-square flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                                                ▶
                                            </div>
                                            <p className="text-xs text-muted-foreground">Video Preview</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
