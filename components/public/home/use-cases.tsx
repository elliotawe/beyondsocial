"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users2, Rocket } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

const useCases = [
    {
        title: "Small Businesses",
        description: "Scale your marketing without a production team. Create high-end product demos and promo videos in minutes.",
        icon: Building2,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10"
    },
    {
        title: "Content Creators",
        description: "Focus on your message, let AI handle the production. Generate consistent, high-fidelity content every single day.",
        icon: Users2,
        color: "text-primary",
        bgColor: "bg-primary/10"
    },
    {
        title: "Marketing Agencies",
        description: "Deliver high-performing social campaigns for clients at 10x speed. More videos, better reach, higher ROI.",
        icon: Rocket,
        color: "text-accent",
        bgColor: "bg-accent/10"
    },
]

export default function UseCases() {
    return (
        <section className="py-32 px-6">
            <div className="max-w-6xl mx-auto space-y-20">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Built for Every Creator</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Whether you&apos;re a solo creator or an established brand, Beyond Social Media Marketing gives you the tools to succeed.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {useCases.map((useCase, i) => {
                        const Icon = useCase.icon
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                viewport={{ once: true }}
                            >
                                <Card className="border-border/40 bg-background/50 backdrop-blur-sm hover:border-primary/20 transition-all h-full group">
                                    <CardHeader>
                                        <div className={`size-12 rounded-2xl ${useCase.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                            <Icon className={`size-6 ${useCase.color}`} />
                                        </div>
                                        <CardTitle className="text-2xl">{useCase.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground leading-relaxed text-base">{useCase.description}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </div>

                {/* Final CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-20 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-primary/10 blur-[100px] -z-10" />
                    <div className="bg-background/80 backdrop-blur-xl rounded-3xl border border-primary/20 p-8 sm:p-16 text-center space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 blur-[80px] -ml-32 -mb-32 rounded-full" />

                        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
                            <h3 className="text-4xl md:text-6xl font-bold tracking-tight">Ready to transform your content?</h3>
                            <p className="text-muted-foreground text-xl">
                                Join 5,000+ creators and businesses using Beyond Social Media Marketing to dominate social media.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                                <Button size="lg" className="rounded-full h-14 px-10 text-lg shadow-xl shadow-primary/20">
                                    Start Creating for Free
                                </Button>
                                <Button variant="outline" size="lg" className="rounded-full h-14 px-10 text-lg border-border/50">
                                    Book a Demo
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
