"use client"

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion } from "framer-motion"
import {
    Zap,
    Video,
    MessageSquare,
    Calendar,
    BarChart3,
    Layers,
    Sparkles
} from "lucide-react"

const features = [
    {
        title: "AI-Powered Script Writing",
        description: "Chat with our AI to refine scripts, hooks, and calls-to-action that capture attention in the first 3 seconds.",
        icon: MessageSquare,
        className: "md:col-span-2 md:row-span-2 bg-linear-to-br from-primary/10 via-background to-background",
        iconColor: "text-primary"
    },
    {
        title: "Image-to-Video",
        description: "Turn static assets into cinematic 9:16 videos.",
        icon: Video,
        className: "md:col-span-1 md:row-span-1",
        iconColor: "text-accent"
    },
    {
        title: "Auto Captions",
        description: "Pixel-perfect captions and trending hashtags.",
        icon: Zap,
        className: "md:col-span-1 md:row-span-1",
        iconColor: "text-yellow-500"
    },
    {
        title: "Social Scheduling",
        description: "One-click publishing to TikTok, IG, and LinkedIn.",
        icon: Calendar,
        className: "md:col-span-1 md:row-span-1",
        iconColor: "text-blue-500"
    },
    {
        title: "Content Intelligence",
        description: "AI-driven analytics that tell you exactly what content will perform best for your specific industry.",
        icon: BarChart3,
        className: "md:col-span-2 md:row-span-1 bg-linear-to-tr from-accent/5 via-background to-background",
        iconColor: "text-accent"
    },
    {
        title: "Brand Consistency",
        description: "Maintain your voice and style across every video.",
        icon: Layers,
        className: "md:col-span-1 md:row-span-1",
        iconColor: "text-purple-500"
    }
]

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
}

export default function Features() {
    return (
        <section id="features" className="py-32 px-6 relative overflow-hidden">
            <div className="max-w-6xl mx-auto space-y-16">
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-xs font-medium text-muted-foreground"
                    >
                        <Zap className="size-3 text-primary" />
                        <span>Core Capabilities</span>
                    </motion.div>
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Powerful Content Suite</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Everything you need to dominate social media, powered by the most advanced AI video models.
                    </p>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    {features.map((feature, i) => {
                        const Icon = feature.icon
                        return (
                            <motion.div key={i} variants={itemVariants} className={feature.className}>
                                <Card className="h-full border-border/40 hover:border-primary/30 transition-all duration-300 group overflow-hidden bg-background/50 backdrop-blur-sm relative">
                                    <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardHeader className="relative z-10">
                                        <div className={`size-10 rounded-xl bg-secondary/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${feature.iconColor}`}>
                                            <Icon className="size-5" />
                                        </div>
                                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                                        <CardDescription className="text-base leading-relaxed mt-2 line-clamp-3">
                                            {feature.description}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </motion.div>
                        )
                    })}
                </motion.div>
            </div>
        </section>
    )
}
