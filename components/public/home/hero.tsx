"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Sparkles } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"

export default function Hero() {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-50" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[100px] rounded-full opacity-30" />
            </div>

            <div className="max-w-6xl w-full mx-auto flex flex-col items-center space-y-16">

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium tracking-wide"
                >
                    <span>The Future of Content Creation</span>
                </motion.div>

                {/* Headline & Subheader */}
                <div className="space-y-6 text-center max-w-4xl mx-auto">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight text-balance leading-[1.1]"
                    >
                        From Chat to <span className="bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Viral Videos</span> in Minutes
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed"
                    >
                        Your AI director for social media success. Generate, edit, and schedule high-performing videos without ever touching a timeline.
                    </motion.p>
                </div>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:row gap-4 justify-center items-center w-full"
                >
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button size="lg" className="rounded-full gap-2 text-base h-14 px-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold" asChild>
                            <Link href="/login">
                                Start Creating Free
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" className="rounded-full gap-2 text-base h-14 px-10 border-border/50 hover:bg-secondary/50 transition-all" asChild>
                            <Link href="#showcase">
                                See Showcase
                            </Link>
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">No credit card required • Join 5,000+ creators</p>
                </motion.div>

                {/* Dashboard Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="relative w-full max-w-5xl mt-8 group"
                >
                    <div className="absolute -inset-0.5 bg-linear-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                    <div className="relative bg-background border border-border/40 rounded-2xl overflow-hidden shadow-2xl">
                        {/* Mockup Overlay */}
                        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background/20 pointer-events-none" />

                        <div className="aspect-16/10 bg-muted/20 relative group">
                            {/* Placeholder for the generated image */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Image
                                    src="/premium_video_dashboard_mockup.png"
                                    alt="Beyond Social Media Marketing Dashboard"
                                    fill
                                    className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                <div className="relative z-10 size-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform cursor-pointer shadow-2xl">
                                    <Play className="size-8 text-white fill-white ml-1" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Cards for context */}
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-6 -right-6 hidden lg:block p-4 bg-background/80 backdrop-blur-md border border-border/40 rounded-xl shadow-xl w-48"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <Sparkles className="size-4 text-green-500" />
                            </div>
                            <div className="text-xs font-semibold">AI Optimized</div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full w-[85%] bg-green-500" />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-2">Retention up by 42%</div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
