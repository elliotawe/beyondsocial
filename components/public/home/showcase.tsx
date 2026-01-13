"use client"

import { Card } from "@/components/ui/card"

const videos = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    title: `Video ${i + 1}`,
}))

export default function Showcase() {
    return (
        <section id="showcase" className="py-20 px-6 border-t border-border/40">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold">Video Showcase</h2>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">See what creators are making with Beyond</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {videos.map((video) => (
                        <Card key={video.id} className="border-border/40 overflow-hidden group cursor-pointer">
                            <div className="aspect-[9/16] bg-gradient-to-br from-secondary/60 via-secondary/40 to-secondary/20 flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                <div className="w-12 h-12 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition">
                                    ▶
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}
