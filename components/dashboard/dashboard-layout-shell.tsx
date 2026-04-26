"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/partials/logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export interface NavLink {
    label: string;
    href: string;
    icon: React.ReactNode;
}

interface DashboardLayoutShellProps {
    children: React.ReactNode;
    links: NavLink[];
    requiredRole?: "admin" | "creator" | "viewer";
}

export default function DashboardLayoutShell({
    children,
    links,
    requiredRole,
}: DashboardLayoutShellProps) {
    const router = useRouter();
    const { user, logout, isLoading } = useAuth();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push("/login");
            } else if (requiredRole && user.role !== requiredRole && user.role !== "admin") {
                router.push("/dashboard");
            }
        }
    }, [user, isLoading, router, requiredRole]);

    if (isLoading || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Logo className="w-12 h-12 text-primary animate-pulse" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading your space...</p>
                </div>
            </div>
        );
    }

    // Strict role check for /admin
    if (requiredRole === "admin" && user.role !== "admin") {
        return null;
    }

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        logout();
    };

    return (
        <div
            className={cn(
                "mx-auto flex w-full flex-1 flex-col overflow-hidden rounded-md border border-border bg-sidebar md:flex-row",
                "h-screen",
            )}
        >
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10 bg-sidebar border-r border-sidebar-border">
                    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto custom-scrollbar">
                        <div className="px-2 py-4">
                            {open ? <Logoo /> : <LogoIcon />}
                        </div>
                        <div className="mt-8 flex flex-col gap-2">
                            {links.map((link, idx) => (
                                <SidebarLink
                                    key={idx}
                                    link={link}
                                    onClick={link.href === "#" ? handleLogout : undefined}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="mt-auto pt-6 border-t border-sidebar-border/30 px-2">
                        {open && (
                            <div className="mb-6 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex justify-between items-end px-1">
                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/60">Balance</p>
                                    <div className="flex items-center gap-1">
                                        <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                                        <p className="text-xs font-black font-outfit text-primary">{user.credits} <span className="text-[10px] font-bold text-muted-foreground/50">/ {user.planTier === "free" ? "15" : user.planTier === "pro" ? "60" : "200"} mo</span></p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/10 p-px">
                                    <div
                                        className="h-full bg-linear-to-r from-primary/80 to-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary),0.3)]"
                                        style={{ width: `${Math.min(100, (user.credits / (user.planTier === "free" ? 15 : user.planTier === "pro" ? 60 : 200)) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex items-center gap-2 group cursor-pointer">
                                    <p className="text-[9px] font-bold text-muted-foreground/60 group-hover:text-primary transition-colors leading-tight">
                                        {user.planTier === "free" ? "Limited Access • Upgrade" : "Professional Account"}
                                    </p>
                                    <ArrowUpRight className="size-2 text-muted-foreground/0 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                </div>
                            </div>
                        )}
                        <div className="bg-card/40 border border-border/20 rounded-2xl p-1 mb-2">
                            <SidebarLink
                                link={{
                                    label: user.name || "User",
                                    href: requiredRole === "admin" ? "/admin/settings" : "/dashboard/settings",
                                    icon: (
                                        <div className="relative">
                                            <Image
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "")}&background=random&bold=true`}
                                                className="h-8 w-8 shrink-0 rounded-xl object-cover ring-2 ring-background ring-offset-2 ring-offset-primary/10 transition-all group-hover:scale-105"
                                                alt="Avatar"
                                                width={32}
                                                height={32}
                                                unoptimized
                                            />
                                            <div className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-emerald-500 border-2 border-background rounded-full" />
                                        </div>
                                    ),
                                }}
                                className="px-3"
                            />
                        </div>
                    </div>
                </SidebarBody>
            </Sidebar>
            <div className="flex flex-1 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 size-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 size-[300px] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />

                <div
                    className={cn(
                        "flex h-full w-full flex-1 flex-col gap-2 rounded-tl-[32px] border-t border-l border-border/40 bg-background/50 backdrop-blur-3xl p-4 md:p-10 overflow-y-auto relative z-10",
                        "animate-in fade-in slide-in-from-right-4 duration-700 ease-out"
                    )}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex-1 flex flex-col"
                    >
                        {children}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

const Logoo = () => {
    return (
        <Link
            href="/"
            className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-foreground"
        >
            <Logo className="h-8 w-auto" />
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium whitespace-pre text-foreground -ml-2"
            >
                eyond Social
            </motion.span>
        </Link>
    );
};

const LogoIcon = () => {
    return (
        <Link
            href="/"
            className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-foreground"
        >
            <Logo className="h-8 w-auto" />
        </Link>
    );
};
