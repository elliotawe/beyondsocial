"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    Users,
    Eye,
    Share2,
    ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";

const barData = [
    { name: "Video 1", views: 4000, engagement: 2400 },
    { name: "Video 2", views: 3000, engagement: 1398 },
    { name: "Video 3", views: 2000, engagement: 9800 },
    { name: "Video 4", views: 2780, engagement: 3908 },
    { name: "Video 5", views: 1890, engagement: 4800 },
];

const pieData = [
    { name: "TikTok", value: 45, color: "oklch(0.3 0.1 240)" },
    { name: "Instagram", value: 35, color: "oklch(0.5 0.1 240)" },
    { name: "Youtube", value: 20, color: "oklch(0.7 0.1 240)" },
];

export default function AnalyticsPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">Analytics Overview</h1>
                    <p className="text-muted-foreground">Deep dive into your content performance and audience demographics.</p>
                </div>
                <Button variant="outline" className="rounded-xl">
                    Last 30 Days
                    <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { title: "Total Views", value: "84.2K", icon: Eye, trend: "+12%" },
                    { title: "Engagement", value: "12.4%", icon: TrendingUp, trend: "+3.2%" },
                    { title: "Shares", value: "2.1K", icon: Share2, trend: "+8%" },
                    { title: "New Followers", value: "842", icon: Users, trend: "+15%" },
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

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-none shadow-sm dark:bg-zinc-900">
                    <CardHeader>
                        <CardTitle>Views vs Engagement</CardTitle>
                        <CardDescription>Comparison of reach and interaction across recent videos.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.02 240 / 0.1)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <Tooltip
                                    cursor={{ fill: 'oklch(0.9 0.02 240 / 0.05)' }}
                                    contentStyle={{ backgroundColor: 'oklch(0.18 0.02 240)', border: 'none', borderRadius: '12px' }}
                                />
                                <Bar dataKey="views" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="engagement" fill="oklch(0.5 0.1 240)" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm dark:bg-zinc-900">
                    <CardHeader>
                        <CardTitle>Platform Distribution</CardTitle>
                        <CardDescription>Where your audience is watching.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold">100%</span>
                            <span className="text-xs text-muted-foreground">Total</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-3xl">
                <p className="text-sm font-bold text-yellow-600 mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    AI Performance Insight
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    "Your 'Desk Setup' videos are performing 40% better on TikTok compared to Instagram Reels. Consider shifting more production focus to vertical tech aesthetic for TikTok."
                </p>
            </div>
        </div>
    );
}
