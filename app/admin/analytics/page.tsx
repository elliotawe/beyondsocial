"use client";

/*
    BarChart,
    Bar,
*/
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    LineChart,
    Line
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
import {
    // TrendingUp,
    Users,
    Video,
    // Share2,
    ChevronDown,
    Activity,
    Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";

const lineData = [
    { name: "Mon", users: 2400, videos: 4000 },
    { name: "Tue", users: 1398, videos: 3000 },
    { name: "Wed", users: 9800, videos: 2000 },
    { name: "Thu", users: 3908, videos: 2780 },
    { name: "Fri", users: 4800, videos: 1890 },
    { name: "Sat", users: 3800, videos: 2390 },
    { name: "Sun", users: 4300, videos: 3490 },
];

const pieData = [
    { name: "Premium", value: 45, color: "#3B82F6" },
    { name: "Free", value: 35, color: "#94A3B8" },
    { name: "Enterprise", value: 20, color: "#8B5CF6" },
];

export default function PlatformAnalytics() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">System Analytics</h1>
                    <p className="text-muted-foreground">Monitor platform-wide growth, user retention, and generation trends.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl">
                        Export Report
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                        Last 7 Days
                        <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { title: "Total Users", value: "24.8K", icon: Users, trend: "+8.2%" },
                    { title: "MAU", value: "12.4K", icon: Activity, trend: "+12.1%" },
                    { title: "Avg. Generation Time", value: "42s", icon: Video, trend: "-5%" },
                    { title: "Global Reach", value: "142 Cities", icon: Globe, trend: "+15%" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm dark:bg-zinc-900/50">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <stat.icon className="w-4 h-4 text-primary" />
                                </div>
                                <span className={cn("text-xs font-bold", stat.trend.startsWith('-') ? "text-emerald-500" : "text-emerald-500")}>
                                    {stat.trend}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                            <p className="text-2xl font-bold font-outfit">{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 border-none shadow-sm dark:bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle>Growth Trends</CardTitle>
                        <CardDescription>Daily active users and video generations over the past week.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                />
                                <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="videos" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm dark:bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle>Subscription Tier Mix</CardTitle>
                        <CardDescription>User distribution across payment plans.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold">Plan Mix</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Revenue Source</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function cn(...inputs: (string | boolean | undefined | null)[]) {
    return inputs.filter(Boolean).join(" ");
}
