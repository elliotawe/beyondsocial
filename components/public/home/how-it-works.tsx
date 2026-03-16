"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Sparkles, Video, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

const steps = [
    {
        icon: MessageSquare,
        title: "Chat & Ideate",
        description: "Tell Beyond what you want to achieve. Our AI analyzes your industry trends to suggest the best concepts.",
        step: "01"
    },
    {
        icon: Sparkles,
        title: "AI Generation",
        description: "Watch as high-fidelity video, scripts, and voiceovers are generated automatically for your brand.",
        step: "02"
    },
    {
        icon: Video,
        title: "Swift Edits",
        description: "Fine-tune with our AI-assisted editor. Trim, re-caption, or swap assets in seconds, not hours.",
        step: "03"
    },
    {
        icon: Calendar,
        title: "Go Viral",
        description: "Schedule at peak times across all your social platforms. Monitor performance and repeat success.",
        step: "04"
    },
]

export default function HowItWorks() {
    return (
        <section id="how" className="py-32 px-6 relative">
            <div className="max-w-6xl mx-auto space-y-20">
                <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Simple. Fast. Smarter.</h2>
                        <p className="text-muted-foreground text-lg">
                            We&apos;ve condensed the entire video production pipeline into four effortless steps.
                            Skip the complexity and focus on the results.
                        </p>
                    </div>
                    <Link href="#features" className="hidden md:flex items-center gap-2 text-primary font-medium group cursor-pointer hover:gap-4 transition-all">
                        <span>See deep dive</span>
                        <ArrowRight className="size-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, i) => {
                        const Icon = step.icon
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="relative group"
                            >
                                <div className="absolute -top-10 left-0 text-7xl font-bold text-primary/5 group-hover:text-primary/10 transition-colors">
                                    {step.step}
                                </div>
                                <Card className="h-full border-border/40 bg-background/40 backdrop-blur-sm hover:translate-y-[-4px] transition-all duration-300">
                                    <CardHeader>
                                        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <Icon className="size-6 text-primary" />
                                        </div>
                                        <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
