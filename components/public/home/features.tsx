"use client"

import { motion } from "framer-motion"
import {
    Zap,
    Video,
    MessageSquare,
    Calendar,
    BarChart3,
    Layers
} from "lucide-react"

const features = [
    {
        title: "Script writing",
        description: "Describe your idea or pick a trending angle. The AI writes a structured script with a hook, body scenes, and a clear CTA — ready to shoot.",
        icon: MessageSquare,
        large: true,
        accent: false,
    },
    {
        title: "Image to video",
        description: "Upload a photo and get a 9:16 clip with AI motion.",
        icon: Video,
        large: false,
        accent: true,
    },
    {
        title: "Captions and hashtags",
        description: "Auto-generated, format-matched, ready to copy.",
        icon: Zap,
        large: false,
        accent: false,
    },
    {
        title: "Social scheduling",
        description: "TikTok, Instagram, LinkedIn, and Facebook — one click.",
        icon: Calendar,
        large: false,
        accent: false,
    },
    {
        title: "Performance insights",
        description: "See which formats, lengths, and topics are actually driving views and engagement for your audience.",
        icon: BarChart3,
        large: true,
        accent: false,
    },
    {
        title: "Brand voice",
        description: "Your tone and style persist across every video.",
        icon: Layers,
        large: false,
        accent: false,
    }
]

export default function Features() {
    return (
        <section id="features" className="py-32 px-6">
            <div className="max-w-6xl mx-auto space-y-16">

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-3 max-w-xl">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                            Everything in one place.
                        </h2>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            No stitching together five tools. Discovery, generation, editing, and publishing live inside the same flow.
                        </p>
                    </div>
                </div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
                    }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    {features.map((feature, i) => {
                        const Icon = feature.icon
                        return (
                            <motion.div
                                key={i}
                                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                                className={feature.large ? "md:col-span-2" : "md:col-span-1"}
                            >
                                <div className={`h-full rounded-lg border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                                    feature.accent
                                        ? "border-primary/20 bg-primary/4 hover:border-primary/35"
                                        : "border-border bg-card hover:border-border/80"
                                }`}>
                                    <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-5">
                                        <Icon className="size-5" />
                                    </div>
                                    <h3 className="text-base font-bold mb-2">{feature.title}</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                                </div>
                            </motion.div>
                        )
                    })}
                </motion.div>

            </div>
        </section>
    )
}
