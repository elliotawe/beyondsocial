"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Video, Activity, ShieldCheck, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IUser, IAdminStats, IJob } from "@/lib/types";

export default function AdminOverview() {
    const [stats, setStats] = useState<IAdminStats | null>(null);
    const [users, setUsers] = useState<IUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, usersRes] = await Promise.all([
                    fetch("/api/admin/stats"),
                    fetch("/api/admin/users")
                ]);

                if (!statsRes.ok || !usersRes.ok) {
                    if (statsRes.status === 401 || usersRes.status === 401) {
                        setError("Unauthorized");
                        return;
                    }
                    throw new Error("Failed to fetch admin data");
                }

                const statsData = await statsRes.json();
                const usersData = await usersRes.json();

                setStats(statsData.stats);
                setUsers(usersData.users);
            } catch (err) {
                console.error(err);
                setError("Something went wrong");
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error === "Unauthorized") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <ShieldCheck className="w-16 h-16 text-red-500" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have administrative privileges.</p>
                <Button variant="outline" asChild>
                    <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
            </div>
        );
    }

    if (!stats) return null;

    const statCards = [
        { title: "Total Platform Users", value: stats.totalUsers.toLocaleString(), icon: Users, trend: "Live", color: "text-blue-500" },
        { title: "Videos Generated", value: stats.totalProjects.toLocaleString(), icon: Video, trend: "Real-time", color: "text-purple-500" },
        { title: "Background Jobs", value: stats.totalJobs.toLocaleString(), icon: Activity, trend: "Status: Active", color: "text-emerald-500" },
        { title: "Active (24h)", value: stats.activeUsers.toLocaleString(), icon: TrendingUp, trend: "User Pulse", color: "text-orange-500" },
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2 font-outfit uppercase italic bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Infrastructure
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Platform systems are operating at peak efficiency.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-10 rounded-xl px-4 border-border/40 font-bold text-[10px] uppercase tracking-widest bg-card/50 backdrop-blur-sm">
                        v2.4.0-stable
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, i) => (
                    <Card key={i} className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{stat.title}</CardTitle>
                            <div className={cn("size-8 rounded-xl flex items-center justify-center bg-current/5", stat.color)}>
                                <stat.icon className="size-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black font-outfit tracking-tighter">{stat.value}</div>
                            <div className="mt-3 flex items-center justify-between">
                                <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                    {stat.trend}
                                </p>
                                <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
                                    <div className={cn("h-full bg-current opacity-30 w-2/3", stat.color.replace('text-', 'bg-'))} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                <Card className="lg:col-span-4 border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">Account Index</CardTitle>
                                <CardDescription className="text-xs">Database dump of recently provisioned accounts.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-black tracking-widest hover:bg-primary/5 hover:text-primary" asChild>
                                <Link href="/admin/users">Query All</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/30">
                            {users.slice(0, 6).map((user: IUser) => (
                                <div key={user._id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors group">
                                    <div className="flex items-center space-x-4">
                                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20 shadow-sm transition-transform group-hover:scale-105">
                                            {user.name?.[0] || user.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold group-hover:text-primary transition-colors">{user.name || "Anonymous Cluster"}</p>
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] border-none bg-primary/5 text-primary px-2 py-0.5">
                                                {user.planTier}
                                            </Badge>
                                            <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">{user.credits} CREDITS</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold">Process Monitor</CardTitle>
                            <Activity className="size-4 text-primary animate-pulse" />
                        </div>
                        <CardDescription className="text-xs">Live telemetry from background processing cluster.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/30">
                            {stats.recentJobs.map((job: IJob) => (
                                <div key={job._id} className="flex items-center justify-between p-4 bg-muted/5 hover:bg-primary/5 transition-colors group">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold uppercase tracking-widest group-hover:text-primary transition-colors">{job.type.replace('_', ' ')}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">
                                            {new Date(job.createdAt).toLocaleTimeString()} • ID: {job._id.slice(-6).toUpperCase()}
                                        </p>
                                    </div>
                                    <Badge className={cn(
                                        "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm border-none",
                                        job.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                                            job.status === "failed" ? "bg-red-500/10 text-red-500" :
                                                "bg-blue-500/10 text-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                    )}>
                                        {job.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-border/30 bg-muted/20">
                            <Button variant="ghost" className="w-full text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary h-10" asChild>
                                <Link href="/admin/jobs">System Queue</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
