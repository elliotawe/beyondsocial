"use client";

import { motion } from "framer-motion";
import {
    Video,
    Calendar,
    TrendingUp,
    Users,
    ArrowUpRight,
    Plus,
    Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";

const data = [
    { name: "Mon", engagement: 2400 },
    { name: "Tue", engagement: 1398 },
    { name: "Wed", engagement: 9800 },
    { name: "Thu", engagement: 3908 },
    { name: "Fri", engagement: 4800 },
    { name: "Sat", engagement: 3800 },
    { name: "Sun", engagement: 4300 },
];

const stats = [
    { title: "Videos created", value: "12", icon: Video, trend: "+2 this week" },
    { title: "Scheduled posts", value: "6", icon: Calendar, trend: "Next in 4h" },
    { title: "Avg engagement", value: "4.8%", icon: TrendingUp, trend: "+1.2% vs last month" },
    { title: "Est. reach", value: "24.5K", icon: Users, trend: "+5.4K today" },
];

export default function DashboardHome() {
    const { user } = useAuth();

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit truncate max-w-[300px]">
                        Welcome back, {user?.name?.split(' ')[0] || "there"}
                    </h1>
                    <p className="text-muted-foreground">Here's what's happening with your social accounts today.</p>
                </div>
                <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                    <Link href="/dashboard/create">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Video
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="border border-border shadow-sm overflow-hidden relative">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <stat.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <Badge variant="ghost" className="text-[10px] text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/10">
                                        {stat.trend}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                                    <p className="text-3xl font-bold font-outfit">{stat.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 border border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Content Engagement</CardTitle>
                        <CardDescription>Sample data showing reach across all platforms (TikTok, Reels, Shorts)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--background)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: 'var(--foreground)'
                                    }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="engagement"
                                    stroke="var(--color-primary)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorEngagement)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Drafts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { title: "Morning coffee b-roll", status: "Draft", date: "2h ago" },
                            { title: "Freelance tips #4", status: "Processing", date: "5h ago" },
                            { title: "Desk setup reveal", status: "Review", date: "Yesterday" }
                        ].map((draft, i) => (
                            <Link
                                key={i}
                                href="/dashboard/create"
                                className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 group transition-all hover:bg-muted/50"
                            >
                                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
                                    <Play className="w-4 h-4 text-muted-foreground group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-semibold truncate">{draft.title}</p>
                                    <p className="text-xs text-muted-foreground">{draft.date}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                    {draft.status}
                                </Badge>
                            </Link>
                        ))}
                        <Button variant="ghost" className="w-full text-zinc-500 text-xs mt-2" asChild>
                            <Link href="/dashboard/analytics">
                                View all activity
                                <ArrowUpRight className="w-3 h-3 ml-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
