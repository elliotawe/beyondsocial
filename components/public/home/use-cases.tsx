"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const useCases = [
    {
        title: "Small Businesses",
        description: "Create product demos and promotional videos without hiring videographers",
    },
    {
        title: "Content Creators",
        description: "Generate consistent, high-quality content faster than ever before",
    },
    {
        title: "Brands & Marketers",
        description: "Scale your social media presence with AI-powered video campaigns",
    },
]

export default function UseCases() {
    return (
        <section className="py-20 px-6 border-t border-border/40">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold">Who It's For</h2>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        Beyond works for anyone who wants to create amazing videos faster
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {useCases.map((useCase, i) => (
                        <Card key={i} className="border-border/40 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                            <CardHeader>
                                <CardTitle>{useCase.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{useCase.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="mt-16 bg-linear-to-r from-secondary/40 via-secondary/20 to-secondary/40 rounded-2xl border border-border/40 p-6 sm:p-12 text-center space-y-6">
                    <h3 className="text-3xl md:text-4xl font-bold">Ready to transform your content?</h3>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        Join thousands of creators and businesses using Beyond to create professional videos
                    </p>
                    <button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 px-8 rounded-full transition inline-block">
                        Start Creating for Free
                    </button>
                </div>
            </div>
        </section>
    )
}
