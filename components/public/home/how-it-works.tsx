"use client"

import { MessageSquare, Sparkles, Video, Calendar } from "lucide-react"
import { motion } from "framer-motion"

const steps = [
    {
        icon: MessageSquare,
        title: "Discover what works",
        description: "Browse trending videos in your niche or describe your idea. Beyond surfaces what's already performing and turns it into a brief.",
        step: "01",
        accent: false,
    },
    {
        icon: Sparkles,
        title: "Script written, video generated",
        description: "AI writes the script, generates a talking-head avatar clip and b-roll footage — all matched to your brand voice.",
        step: "02",
        accent: true,
    },
    {
        icon: Video,
        title: "Review and adjust",
        description: "Watch the result, tweak the script or swap a scene. The editor is fast by design — no timeline, no keyframes.",
        step: "03",
        accent: false,
    },
    {
        icon: Calendar,
        title: "Schedule across platforms",
        description: "Publish to TikTok, Instagram, LinkedIn, and Facebook in one click. Track views and engagement from the same place.",
        step: "04",
        accent: false,
    },
]

export default function HowItWorks() {
    return (
        <section id="how" className="py-32 px-6">
            <div className="max-w-6xl mx-auto">

                <div className="mb-20 max-w-2xl">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Four steps.<br />One flow.
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        We collapsed the entire production pipeline. Discovery, scripting, generation, and publishing happen without leaving the app.
                    </p>
                </div>

                <div className="space-y-0">
                    {steps.map((step, i) => {
                        const Icon = step.icon
                        const isLast = i === steps.length - 1
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -16 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                viewport={{ once: true }}
                                className="grid grid-cols-[auto_1fr] gap-8 relative"
                            >
                                {/* Step column */}
                                <div className="flex flex-col items-center">
                                    <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${step.accent ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                                        <Icon className="size-5" />
                                    </div>
                                    {!isLast && (
                                        <div className="w-px flex-1 bg-border/50 my-3" />
                                    )}
                                </div>

                                {/* Content column */}
                                <div className={`pb-12 ${isLast ? "" : ""}`}>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">{step.step}</p>
                                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed max-w-lg">{step.description}</p>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

            </div>
        </section>
    )
}
