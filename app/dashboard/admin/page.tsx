"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
    Users,
    Activity,
    Terminal,
    ShieldAlert,
    Database,
    Search,
    MoreVertical,
    ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Logo from "@/components/partials/logo";

export default function AdminConsole() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && (!user || user.role !== "admin")) {
            router.push("/");
        }
    }, [user, isLoading, router]);

    if (isLoading || !user || user.role !== "admin") {
        return <Logo className="w-8 h-8 text-primary animate-pulse" />;
    }

    const users = [
        { name: "Elliot Evans", email: "elliot@posta.io", role: "Admin", status: "Active" },
        { name: "Sarah Chen", email: "sarah@posta.io", role: "Creator", status: "Active" },
        { name: "Marcus Thorne", email: "marcus@posta.io", role: "Viewer", status: "Inactive" },
        { name: "Aria Vane", email: "aria@posta.io", role: "Creator", status: "Active" },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">Admin Console</h1>
                    <p className="text-muted-foreground">Monitor platform health and manage internal access.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl">Export Logs</Button>
                    <Button className="rounded-xl">System Maintenance</Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {[
                    { title: "Total Users", value: "2,842", icon: Users, trend: "+12%" },
                    { title: "Active Generations", value: "148", icon: Activity, trend: "+5%" },
                    { title: "Storage Usage", value: "64%", icon: Database, trend: "+2%" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm dark:bg-zinc-900">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <stat.icon className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-xs font-bold text-emerald-500">{stat.trend}</span>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                            <p className="text-2xl font-bold font-outfit">{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <Card className="lg:col-span-8 border-none shadow-sm dark:bg-zinc-900 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl">User Management</CardTitle>
                            <CardDescription>Manage internal staff and permissions.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search users..." className="pl-9 rounded-xl h-9 text-xs" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase text-[10px] font-bold tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {users.map((u, i) => (
                                        <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{u.name}</span>
                                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="rounded-md font-mono text-[10px]">{u.role}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                                    <span className="text-xs">{u.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon" className="rounded-full">
                                                    <MoreVertical className="w-4 h-4 text-zinc-400" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-sm dark:bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-primary" />
                                System Logs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { msg: "API Key rotated for GCP-3", time: "2m ago", type: "info" },
                                { msg: "Generation failed #8492", time: "14m ago", type: "error" },
                                { msg: "Daily backup completed", time: "1h ago", type: "success" },
                                { msg: "User login: sarah@posta.io", time: "2h ago", type: "info" },
                            ].map((log, i) => (
                                <div key={i} className="flex gap-3 text-xs">
                                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${log.type === 'error' ? 'bg-red-500' :
                                        log.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                                        }`} />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-mono truncate text-zinc-600 dark:text-zinc-400">{log.msg}</p>
                                        <p className="text-[10px] text-zinc-400">{log.time}</p>
                                    </div>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full text-xs rounded-xl mt-2 text-primary">
                                View full terminal
                                <ArrowUpRight className="w-3 h-3 ml-1" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-red-500/5 border border-red-500/10 rounded-2xl">
                        <CardContent className="p-6 flex items-start gap-4">
                            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-red-600 mb-1">Security Alert</p>
                                <p className="text-xs text-red-600/70">
                                    Unusual login attempt detected from IP 192.168.1.1. Automatic block trial initiated.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                Linked Platforms
                            </CardTitle>
                            <CardDescription className="text-xs">Manage system-wide OAuth connections.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { name: "TikTok Business", status: "Connected", icon: "📱", color: "bg-zinc-950" },
                                { name: "Instagram Graph", status: "Connected", icon: "📸", color: "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500" },
                                { name: "YouTube Data", status: "Disconnected", icon: "🎥", color: "bg-red-600" },
                            ].map((platform, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg ${platform.color} flex items-center justify-center text-xs text-white shadow-sm`}>
                                            {platform.icon}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold">{platform.name}</p>
                                            <p className={`text-[9px] ${platform.status === 'Connected' ? 'text-emerald-500' : 'text-zinc-400'}`}>{platform.status}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] rounded-lg">
                                        {platform.status === 'Connected' ? 'Manage' : 'Connect'}
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
