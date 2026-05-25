"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    Video,
    Calendar,
    ArrowUpRight,
    Plus,
    Play,
    Activity,
    Loader2,
    Zap,
    TrendingUp,
} from "lucide-react";
import { AnalyticsChart } from "@/components/dashboard/analytics-view";

interface Project {
    _id: string;
    title: string;
    thumbnail: string | null;
    status: string;
    socialStatus: string;
    createdAt: string;
    analytics: {
        views: number;
        engagement: number;
        shares: number;
    };
}

function StatusDot({ status }: { status: string }) {
    return (
        <span className={cn(
            "inline-block size-1.5 rounded-full",
            status === "completed" ? "bg-emerald-500" :
            status === "failed" ? "bg-red-500" :
            status === "processing" ? "bg-amber-500 animate-pulse" :
            "bg-muted-foreground/40"
        )} />
    );
}

export default function DashboardHome() {
    const { user, isLoading: authLoading } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const res = await fetch("/api/projects");
                const data = await res.json();
                if (data.success) setProjects(data.projects);
            } catch (err) {
                console.error("Failed to fetch projects:", err);
            } finally {
                setIsLoading(false);
            }
        }
        if (!authLoading && user) fetchDashboardData();
    }, [authLoading, user]);

    const totalViews = projects.reduce((acc, p) => acc + (p.analytics?.views || 0), 0);
    const scheduledCount = projects.filter((p) => p.socialStatus === "scheduled").length;
    const planMonthlyLimit = user?.planTier === "pro" ? 60 : user?.planTier === "business" ? 200 : 15;
    const creditsUsed = planMonthlyLimit - (user?.credits ?? 0);
    const creditsUsedPct = Math.min(100, Math.max(0, (creditsUsed / planMonthlyLimit) * 100));

    const chartData = projects
        .filter((p) => p.socialStatus === "posted")
        .slice(0, 5)
        .reverse()
        .map((p) => ({
            name: p.title.length > 10 ? p.title.substring(0, 10) + "…" : p.title,
            views: p.analytics?.views || 0,
            engagement: p.analytics?.engagement || 0,
        }));

    if (isLoading || authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="size-8 animate-spin text-primary/40" />
                <p className="text-xs font-medium text-muted-foreground/50">Loading…</p>
            </div>
        );
    }

    const firstName = user?.name?.split(" ")[0] || "there";

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight font-sans">
                        Hey {firstName}.
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {projects.length === 0
                            ? "Ready to make your first video?"
                            : `${projects.length} ${projects.length === 1 ? "video" : "videos"} created so far.`}
                    </p>
                </div>
                <Button asChild className="rounded-md px-5 h-10 font-semibold shrink-0">
                    <Link href="/dashboard/create">
                        <Plus className="size-4 mr-2" />
                        New Video
                    </Link>
                </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    {
                        label: "Credits Left",
                        value: user?.credits?.toString() || "0",
                        sub: `of ${planMonthlyLimit} this month`,
                        icon: Activity,
                    },
                    {
                        label: "Videos",
                        value: projects.length.toString(),
                        sub: "all time",
                        icon: Video,
                    },
                    {
                        label: "Scheduled",
                        value: scheduledCount.toString(),
                        sub: scheduledCount > 0 ? "coming up" : "none pending",
                        icon: Calendar,
                    },
                    {
                        label: "Total Views",
                        value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews.toString(),
                        sub: "across platforms",
                        icon: TrendingUp,
                    },
                ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border bg-card p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</span>
                            <s.icon className="size-3.5 text-muted-foreground/40" />
                        </div>
                        <p className="text-2xl font-bold font-sans tracking-tight">{s.value}</p>
                        <p className="text-[11px] text-muted-foreground/60">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Credit bar */}
            <div className="rounded-lg border border-border bg-card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <Zap className="size-3.5 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-bold">Monthly usage</p>
                        <p className="text-[11px] text-muted-foreground">{creditsUsed} of {planMonthlyLimit} credits</p>
                    </div>
                </div>
                <div className="flex-1">
                    <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-700",
                                creditsUsedPct > 80 ? "bg-red-500" : creditsUsedPct > 55 ? "bg-amber-500" : "bg-primary"
                            )}
                            style={{ width: `${creditsUsedPct}%` }}
                        />
                    </div>
                </div>
                <Link
                    href="/dashboard/settings?tab=billing"
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                >
                    Billing <ArrowUpRight className="size-3" />
                </Link>
            </div>

            {/* Chart + Recent */}
            <div className="grid gap-5 lg:grid-cols-3">

                {/* Chart */}
                <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="font-bold text-sm">Engagement</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Last 5 posted videos</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border/50 rounded-lg px-2.5 py-1">
                            Views &amp; Likes
                        </span>
                    </div>
                    <div className="h-70">
                        <AnalyticsChart data={chartData} />
                    </div>
                </div>

                {/* Recent projects */}
                <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
                    <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-border/30">
                        <p className="font-bold text-sm">Recent</p>
                        <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">
                            {projects.length}
                        </span>
                    </div>

                    <div className="flex-1 divide-y divide-border/30">
                        {projects.length > 0 ? (
                            projects.slice(0, 5).map((project) => (
                                <Link
                                    key={project._id}
                                    href={`/dashboard/projects/${project._id}`}
                                    className="flex items-center gap-3 px-5 py-3.5 group hover:bg-primary/5 transition-colors"
                                >
                                    <div className="size-10 bg-muted rounded-md flex items-center justify-center overflow-hidden shrink-0">
                                        {project.thumbnail ? (
                                            <Image
                                                src={project.thumbnail}
                                                alt={project.title}
                                                className="w-full h-full object-cover"
                                                width={40}
                                                height={40}
                                            />
                                        ) : (
                                            <Play className="size-4 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                            {project.title}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                            {new Date(project.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                        </p>
                                    </div>
                                    <StatusDot status={project.status} />
                                </Link>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                                <Video className="size-8 text-muted-foreground/20 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">No videos yet</p>
                                <Button variant="link" asChild className="mt-1 text-primary text-xs h-auto p-0">
                                    <Link href="/dashboard/create">Create your first one</Link>
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-border/30 px-5 py-3">
                        <Link
                            href="/dashboard/projects"
                            className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                            View all projects <ArrowUpRight className="size-3" />
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
