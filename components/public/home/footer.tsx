"use client"

import Link from "next/link"

export default function Footer() {
    return (
        <footer className="border-t border-border/40 bg-secondary/10 py-12 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div>
                        <h4 className="font-semibold mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Templates
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Careers
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Docs
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Support
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Community
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Privacy
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Terms
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-foreground transition">
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
                    <p>&copy; 2025 Beyond. All rights reserved.</p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <Link href="#" className="hover:text-foreground transition">
                            Twitter
                        </Link>
                        <Link href="#" className="hover:text-foreground transition">
                            LinkedIn
                        </Link>
                        <Link href="#" className="hover:text-foreground transition">
                            Instagram
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
