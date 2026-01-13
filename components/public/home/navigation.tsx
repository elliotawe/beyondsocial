"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Navigation() {
    return (
        <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
            <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold text-foreground">
                    Beyond
                </Link>

                <div className="hidden md:flex gap-8">
                    <Link href="#how" className="text-sm text-muted-foreground hover:text-foreground transition">
                        How It Works
                    </Link>
                    <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition">
                        Features
                    </Link>
                    <Link href="#showcase" className="text-sm text-muted-foreground hover:text-foreground transition">
                        Showcase
                    </Link>
                </div>

                <div className="flex gap-3">
                    <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                        <Link href="/login">Log In</Link>
                    </Button>
                    <Button size="sm" className="bg-white text-black hover:bg-gray-100" asChild>
                        <Link href="/login">Get Started</Link>
                    </Button>
                </div>
            </div>
        </nav>
    )
}
