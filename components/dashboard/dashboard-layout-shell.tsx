"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/partials/logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { motion } from "framer-motion";

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
                    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                        {open ? <Logoo /> : <LogoIcon />}
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
                    <div className="mt-auto pt-4 border-t border-sidebar-border/50">
                        {open && (
                            <div className="px-4 mb-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Credits</p>
                                    <p className="text-xs font-bold text-primary">{user.credits} / {user.planTier === "free" ? "5" : user.planTier === "pro" ? "50" : "Unlimited"}</p>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${Math.min(100, (user.credits / (user.planTier === "free" ? 5 : user.planTier === "pro" ? 50 : 100)) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-[9px] text-muted-foreground leading-tight">
                                    {user.planTier === "free" ? "Upgrade for more power." : "You're on the Pro plan."}
                                </p>
                            </div>
                        )}
                        <SidebarLink
                            link={{
                                label: user.name || "User",
                                href: requiredRole === "admin" ? "/admin/settings" : "/dashboard/settings",
                                icon: (
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                                        className="h-7 w-7 shrink-0 rounded-full"
                                        width={50}
                                        height={50}
                                        alt="Avatar"
                                    />
                                ),
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
            <div className="flex flex-1">
                <div className="flex h-full w-full flex-1 flex-col gap-2 rounded-tl-2xl border border-border bg-background p-2 md:p-10 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}

const Logoo = () => {
    return (
        <a
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
        </a>
    );
};

const LogoIcon = () => {
    return (
        <a
            href="/"
            className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-foreground"
        >
            <Logo className="h-8 w-auto" />
        </a>
    );
};
