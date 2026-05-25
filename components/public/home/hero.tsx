"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import Image from "next/image"

function splitWords(text: string) {
    return text.split(" ").map((word, i) => ({ word, i }))
}

const wordVariants: Variants = {
    hidden: {
        clipPath: "inset(0 0 110% 0)",
        y: 24,
        opacity: 0,
    },
    show: (i: number) => ({
        clipPath: "inset(0 0 0% 0)",
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.55,
            delay: i * 0.045,
            ease: [0.16, 1, 0.3, 1],
        },
    }),
}

function AnimatedHeadline({
    line1,
    line2,
    baseDelay = 0,
}: {
    line1: string
    line2: string
    baseDelay?: number
}) {
    const words1 = splitWords(line1)
    const words2 = splitWords(line2)
    const offset2 = words1.length

    return (
        <div className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight leading-[1.05] text-center">
            <div className="flex flex-wrap justify-center gap-x-[0.28em] overflow-hidden pb-1">
                {words1.map(({ word, i }) => (
                    <motion.span
                        key={i}
                        custom={baseDelay / 0.045 + i}
                        variants={wordVariants}
                        initial="hidden"
                        animate="show"
                        className="inline-block"
                        style={{ willChange: "transform, opacity" }}
                    >
                        {word}
                    </motion.span>
                ))}
            </div>
            <div className="flex flex-wrap justify-center gap-x-[0.28em] overflow-hidden pb-1">
                {words2.map(({ word, i }) => (
                    <motion.span
                        key={i}
                        custom={baseDelay / 0.045 + offset2 + i}
                        variants={wordVariants}
                        initial="hidden"
                        animate="show"
                        className="inline-block text-primary/50"
                        style={{ willChange: "transform, opacity" }}
                    >
                        {word}
                    </motion.span>
                ))}
            </div>
        </div>
    )
}

function DotGrid() {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (reduced) return

        function onMove(e: MouseEvent) {
            const cx = (e.clientX / window.innerWidth - 0.5) * 28
            const cy = (e.clientY / window.innerHeight - 0.5) * 18
            el!.style.setProperty("--gx", `${cx}px`)
            el!.style.setProperty("--gy", `${cy}px`)
        }

        window.addEventListener("mousemove", onMove, { passive: true })
        return () => window.removeEventListener("mousemove", onMove)
    }, [])

    return (
        <div
            ref={ref}
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
                backgroundImage:
                    "radial-gradient(circle at 1px 1px, oklch(0.22 0.1 258 / 0.07) 1px, transparent 0)",
                backgroundSize: "30px 30px",
                backgroundPosition: "var(--gx, 0px) var(--gy, 0px)",
                transition: "background-position 0.15s ease-out",
                maskImage:
                    "radial-gradient(ellipse 90% 80% at 50% 40%, black 40%, transparent 100%)",
                WebkitMaskImage:
                    "radial-gradient(ellipse 90% 80% at 50% 40%, black 40%, transparent 100%)",
            }}
        />
    )
}

function ScrollDriftDashboard({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (reduced) return

        // CSS scroll-driven animation — set as inline style
        const supportsScrollTimeline =
            CSS.supports("animation-timeline", "scroll()")

        if (supportsScrollTimeline) {
            el.style.animationName = "heroParallax"
            ;(el.style as CSSStyleDeclaration & { animationTimeline: string }).animationTimeline = "scroll(root)"
            el.style.animationFillMode = "both"
            el.style.animationDuration = "1ms" // required by spec
            el.style.animationTimingFunction = "linear"
            return
        }

        // JS fallback
        function onScroll() {
            const y = window.scrollY * 0.18
            el!.style.transform = `translateY(-${y}px)`
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <div ref={ref} className="w-full">
            {children}
        </div>
    )
}

export default function Hero() {
    return (
        <>
            <style>{`
                @keyframes heroParallax {
                    from { transform: translateY(0px); }
                    to   { transform: translateY(-80px); }
                }
            `}</style>

            <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden">
                <DotGrid />

                <div className="relative z-10 max-w-6xl w-full mx-auto flex flex-col items-center space-y-14">

                    <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="text-primary/60 text-xs font-semibold uppercase tracking-widest"
                    >
                        AI-powered video, start to scheduled
                    </motion.p>

                    <div className="space-y-5 max-w-4xl mx-auto w-full">
                        <AnimatedHeadline
                            line1="From idea to posted."
                            line2="In minutes."
                            baseDelay={0.08}
                        />
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.72, ease: [0.22, 1, 0.36, 1] }}
                            className="text-lg md:text-xl text-muted-foreground text-balance max-w-xl mx-auto leading-relaxed text-center"
                        >
                            Beyond Social finds what&apos;s trending, writes the script, generates the video, and schedules it. You make the call.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.84, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col sm:flex-row gap-4 items-center"
                    >
                        <Button size="lg" className="rounded-md gap-2 text-base h-12 px-8 font-semibold" asChild>
                            <Link href="/login">
                                Start for free
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="rounded-md gap-2 text-base h-12 px-8 border-border"
                            asChild
                        >
                            <Link href="#showcase">See examples</Link>
                        </Button>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.96 }}
                        className="text-xs text-muted-foreground/50"
                    >
                        No credit card required
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-5xl"
                    >
                        <ScrollDriftDashboard>
                            <div className="relative bg-card border border-border rounded-xl overflow-hidden shadow-xl shadow-black/10">
                                <div className="aspect-video bg-muted/20 relative">
                                    <Image
                                        src="/premium_video_dashboard_mockup.png"
                                        alt="Beyond Social dashboard"
                                        fill
                                        className="object-cover opacity-90"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-black/12" />
                                </div>
                            </div>
                            <div
                                aria-hidden
                                className="absolute -inset-px rounded-2xl pointer-events-none -z-10"
                                style={{
                                    boxShadow:
                                        "0 40px 100px -20px oklch(0.22 0.1 258 / 0.12)",
                                }}
                            />
                        </ScrollDriftDashboard>
                    </motion.div>

                </div>
            </section>
        </>
    )
}
