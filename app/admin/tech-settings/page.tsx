"use client";

import {
    Terminal,
    ShieldAlert,
    Key,
    // Database,
    // Cpu,
    // Globe,
    Zap,
    RefreshCw, // Using RefreshCw instead of RefreshCcw if Ccw is missing
    Copy,
    ArrowUpRight,
    // Lock,
    // AlertCircle,
    // Activity,
    // Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function TechSettings() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">Tech Settings</h1>
                <p className="text-muted-foreground">Manage API infrastructure, system performance, and security configurations.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-none shadow-sm dark:bg-zinc-900 overflow-hidden col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary" />
                            Global API Keys
                        </CardTitle>
                        <CardDescription>System-wide keys for external AI and storage providers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {[
                            { name: "OpenAI GPT-4o Hub", key: "sk-proj-....A7B2", status: "Active" },
                            { name: "Wan AI 2.6 Engine", key: "wan-k-....9D4F", status: "Active" },
                            { name: "AWS S3 Backup Bucket", key: "AKIA....L2P9", status: "Active" },
                            { name: "Google Cloud Video Intelligence", key: "gcp-id-....3E11", status: "Inactive", color: "text-amber-500" },
                        ].map((provider, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold">{provider.name}</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                                            {provider.key}
                                        </code>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={provider.status === 'Active' ? 'secondary' : 'outline'} className={cn("text-[10px] uppercase", provider.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-none' : '')}>
                                        {provider.status}
                                    </Badge>
                                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg">Rotate</Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-sm dark:bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                Cache & Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Redis Cache Hit Rate</span>
                                <span className="text-sm font-bold">94.2%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Edge Latency (Global)</span>
                                <span className="text-sm font-bold">12ms</span>
                            </div>
                            <Button className="w-full gap-2 rounded-xl mt-2" variant="outline">
                                <RefreshCw className="w-4 h-4" />
                                Purge Global Cache
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm dark:bg-zinc-900 border border-red-500/10 bg-red-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-red-600 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" />
                                Critical Maintenance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-red-600/70 mb-4">
                                Enable Maintenance Mode to block all creative workflows while performing core updates.
                            </p>
                            <Button variant="destructive" className="w-full rounded-xl text-xs h-9">
                                Enable Maintenance Mode
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border-none shadow-sm dark:bg-zinc-900">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-primary" />
                                System Event Logs
                            </CardTitle>
                            <CardDescription>Live feed of platform infrastructure events.</CardDescription>
                        </div>
                        <Button variant="ghost" className="text-xs text-primary">
                            View Console
                            <ArrowUpRight className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 font-mono text-xs">
                        {[
                            { time: "08:14:22.401", level: "INFO", source: "worker-prod-04", msg: "Video generation job #9412 completed successfully." },
                            { time: "08:12:45.192", level: "WARN", source: "auth-gateway", msg: "Rate limit threshold reached for IP 45.2.1.94" },
                            { time: "08:10:11.002", level: "INFO", source: "database", msg: "Scheduled vacuum complete on 'generations' table." },
                            { time: "08:05:33.881", level: "ERROR", source: "wan-ai-connector", msg: "Connection timeout while requesting shard inference." },
                        ].map((log, i) => (
                            <div key={i} className="flex gap-4 p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/50 group">
                                <span className="text-zinc-400 shrink-0">{log.time}</span>
                                <span className={cn("font-bold shrink-0 w-12", log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-amber-500' : 'text-blue-500')}>
                                    {log.level}
                                </span>
                                <span className="text-zinc-500 shrink-0">[{log.source}]</span>
                                <span className="text-zinc-600 dark:text-zinc-300 truncate">{log.msg}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
