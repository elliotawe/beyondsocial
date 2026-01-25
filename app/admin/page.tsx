"use client";

import { useAuth } from "@/lib/auth-context";
import {
    Users,
    Activity,
    Video,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function AdminOverview() {
    const stats = [
        { title: "Total Platform Users", value: "12,482", icon: Users, trend: "+12.5%", color: "text-blue-500" },
        { title: "Videos Generated", value: "45,291", icon: Video, trend: "+18.2%", color: "text-purple-500" },
        { title: "Active subscriptions", value: "842", icon: TrendingUp, trend: "+4.3%", color: "text-emerald-500" },
        { title: "System Uptime", value: "99.98%", icon: Activity, trend: "Stable", color: "text-orange-500" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Overview</h1>
                <p className="text-muted-foreground">Real-time health and growth metrics for Beyond Social.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm dark:bg-zinc-900/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                            <stat.icon className={cn("w-4 h-4", stat.color)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground pt-1">
                                <span className={stat.trend.startsWith('+') ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                                    {stat.trend}
                                </span>
                                {stat.trend !== "Stable" && " from last month"}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                <Card className="lg:col-span-4 border-none shadow-sm dark:bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle>Resource Usage</CardTitle>
                        <CardDescription>GPU and Storage consumption across all nodes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">GPU Rendering Power</span>
                                <span className="font-medium">78%</span>
                            </div>
                            <Progress value={78} className="h-2" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Object Storage</span>
                                <span className="font-medium">64%</span>
                            </div>
                            <Progress value={64} className="h-2" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">API Rate Limit (Avg)</span>
                                <span className="font-medium">42%</span>
                            </div>
                            <Progress value={42} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-none shadow-sm dark:bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle>System Health</CardTitle>
                        <CardDescription>Recent status checks and incidents.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { name: "Auth Service", status: "Healthy", icon: CheckCircle2, color: "text-emerald-500" },
                            { name: "Video Processing", status: "Healthy", icon: CheckCircle2, color: "text-emerald-500" },
                            { name: "Database Cluster", status: "Healthy", icon: CheckCircle2, color: "text-emerald-500" },
                            { name: "Global CDN", status: "Degraded", icon: AlertCircle, color: "text-amber-500" },
                            { name: "AI Inference Hub", status: "Healthy", icon: CheckCircle2, color: "text-emerald-500" },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                <span className="text-sm font-medium">{s.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{s.status}</span>
                                    <s.icon className={cn("w-4 h-4", s.color)} />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

