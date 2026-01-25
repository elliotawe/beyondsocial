"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

const features = [
    {
        title: "AI-Powered Script Writing",
        description: "Chat with AI to refine scripts and make your content engaging",
    },
    {
        title: "Image-to-Video Generation",
        description: "Turn static images into dynamic videos with smooth transitions",
    },
    {
        title: "Auto Captions & Hashtags",
        description: "Generate on-brand captions and trending hashtags automatically",
    },
    {
        title: "Built-in Video Editor",
        description: "Fine-tune videos with intuitive editing tools",
    },
    {
        title: "Social Media Scheduling",
        description: "Schedule posts across Instagram, TikTok, YouTube and more",
    },
    {
        title: "Analytics & Recommendations",
        description: "Get insights on performance and suggestions to improve reach",
    },
]

export default function Features() {
    return (
        <section id="features" className="py-20 px-6 border-t border-border/40">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold">Powerful Features</h2>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        Everything you need to create, edit, and share amazing content
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {features.map((feature, i) => (
                        <Card key={i} className="border-border/40 bg-secondary/10">
                            <CardHeader>
                                <div className="flex items-start gap-4">
                                    <CheckCircle2 className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                                    <div>
                                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                                        <CardDescription className="mt-2">{feature.description}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}
