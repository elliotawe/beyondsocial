"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Sparkles, Video, Calendar } from "lucide-react"

const steps = [
    {
        icon: MessageSquare,
        title: "Chat",
        description: "Describe the video you want to create in natural language",
    },
    {
        icon: Sparkles,
        title: "Generate",
        description: "AI creates and edits video with captions and audio",
    },
    {
        icon: Video,
        title: "Refine",
        description: "Make quick edits and adjustments with our built-in editor",
    },
    {
        icon: Calendar,
        title: "Schedule",
        description: "Post directly to social media or schedule for later",
    },
]

export default function HowItWorks() {
    return (
        <section id="how" className="py-20 px-6 border-t border-border/40">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold">How It Works</h2>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        Create professional videos in just four simple steps
                    </p>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                    {steps.map((step, i) => {
                        const Icon = step.icon
                        return (
                            <Card key={i} className="border-border/40 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                                <CardHeader>
                                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <CardTitle className="text-xl">{step.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{step.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
