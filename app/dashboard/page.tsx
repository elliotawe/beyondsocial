import Image from "next/image";
import { auth } from "@/auth";
import { getUserProjects } from "@/app/actions/projects";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    Video,
    Calendar,
    Users,
    ArrowUpRight,
    Plus,
    Play,
    Activity
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

export default async function DashboardHome() {
    const session = await auth();
    const user = session?.user;
    const projects = await getUserProjects();

    // Calculate real stats
    const totalViews = projects.reduce((acc: number, p: Project) => acc + (p.analytics?.views || 0), 0);
    // const totalEngagement = projects.reduce((acc: number, p: Project) => acc + (p.analytics?.engagement || 0), 0);
    // const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews * 100).toFixed(1) : "0";
    const scheduledCount = projects.filter((p: Project) => p.socialStatus === "scheduled").length;

    const stats = [
        { title: "Remaining Credits", value: (user as { credits?: number | string })?.credits?.toString() || "0", icon: Activity, trend: "Monthly", color: "text-amber-500" },
        { title: "Videos created", value: projects.length.toString(), icon: Video, trend: "All Time" },
        { title: "Scheduled posts", value: scheduledCount.toString(), icon: Calendar, trend: scheduledCount > 0 ? "Upcoming" : "None" },
        { title: "Total views", value: totalViews.toLocaleString(), icon: Users, trend: "Across Platforms" },
    ];

    // Prepare chart data (top 5 recent posted projects)
    const chartData = projects
        .filter((p: Project) => p.socialStatus === "posted")
        .slice(0, 5)
        .reverse()
        .map((p: Project) => ({
            name: p.title.length > 10 ? p.title.substring(0, 10) + "..." : p.title,
            views: p.analytics?.views || 0,
            engagement: p.analytics?.engagement || 0,
        }));

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 font-outfit bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Welcome back, {user?.name?.split(' ')[0] || "Creator"}
                    </h1>
                    <p className="text-muted-foreground font-medium">Your social command center is ready.</p>
                </div>
                <Button asChild size="lg" className="rounded-2xl shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 px-6 py-6 transition-all hover:scale-[1.02]">
                    <Link href="/dashboard/create">
                        <Plus className="size-5 mr-2" />
                        Create New Video
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <Card key={stat.title} className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden relative group hover:border-primary/20 transition-all duration-300">
                        <CardContent className="p-7">
                            <div className="flex justify-between items-start mb-6">
                                <div className="size-10 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                    <stat.icon className="size-5 text-primary" />
                                </div>
                                <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 py-1">
                                    {stat.trend}
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.title}</p>
                                <p className="text-4xl font-extrabold font-outfit tracking-tight">{stat.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">Content Engagement</CardTitle>
                                <CardDescription className="text-xs">Visualizing reach and engagement for your last 5 posted videos.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 rounded-full text-[10px] uppercase font-bold tracking-widest border-border/40">
                                Last 7 Days
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[320px] mt-2">
                        <AnalyticsChart data={chartData} />
                    </CardContent>
                </Card>

                <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold">Recent Projects</CardTitle>
                            <Badge className="rounded-full size-6 flex items-center justify-center p-0 bg-primary/10 text-primary border-none font-bold text-[10px]">
                                {projects.length}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/30">
                            {projects.length > 0 ? (
                                projects.slice(0, 4).map((project: Project) => (
                                    <Link
                                        key={project._id}
                                        href={`/dashboard/projects/${project._id}`}
                                        className="flex items-center gap-4 p-5 group transition-all hover:bg-primary/5 relative"
                                    >
                                        <div className="size-12 bg-muted rounded-2xl flex items-center justify-center overflow-hidden relative shadow-sm transition-transform group-hover:scale-105">
                                            {project.thumbnail ? (
                                                <Image src={project.thumbnail} alt={project.title} className="w-full h-full object-cover" width={48} height={48} />
                                            ) : (
                                                <Play className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{project.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>
                                                <span className="size-1 rounded-full bg-border" />
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {project.analytics?.views || 0} views
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-sm border-none shadow-xs",
                                            project.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                                                project.status === "failed" ? "bg-red-500/10 text-red-500" :
                                                    project.status === "processing" ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
                                        )}>
                                            {project.status}
                                        </Badge>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Video className="size-10 mx-auto mb-4 opacity-20" />
                                    <p className="text-sm font-medium">No videos created yet.</p>
                                    <Button variant="link" asChild className="mt-2 text-primary">
                                        <Link href="/dashboard/create">Start your first draft</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-muted/20 border-t border-border/30">
                            <Button variant="ghost" className="w-full text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary h-10" asChild>
                                <Link href="/dashboard/projects">
                                    View full library
                                    <ArrowUpRight className="size-3 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
