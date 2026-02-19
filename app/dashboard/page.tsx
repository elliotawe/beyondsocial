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
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit truncate max-w-[300px]">
                        Welcome back, {user?.name?.split(' ')[0] || "Creator"}
                    </h1>
                    <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your social accounts today.</p>
                </div>
                <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                    <Link href="/dashboard/create">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Video
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border border-border shadow-sm overflow-hidden relative">
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
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 border border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Content Engagement</CardTitle>
                        <CardDescription>Visualizing reach and engagement for your last 5 posted videos.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] mt-4">
                        <AnalyticsChart data={chartData} />
                    </CardContent>
                </Card>

                <Card className="border border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Projects</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {projects.length > 0 ? (
                            projects.map((project: Project) => (
                                <Link
                                    key={project._id}
                                    href={`/dashboard/projects/${project._id}`}
                                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 group transition-all hover:bg-muted/50"
                                >
                                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
                                        {project.thumbnail ? (
                                            <Image src={project.thumbnail} alt={project.title} className="w-full h-full object-cover" width={48} height={48} />
                                        ) : (
                                            <Play className="w-4 h-4 text-muted-foreground group-hover:scale-110 transition-transform" />
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-semibold truncate">{project.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className={cn(
                                        "text-[10px] uppercase font-bold tracking-wider",
                                        project.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                            project.status === "failed" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                project.status === "processing" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : ""
                                    )}>
                                        {project.status}
                                    </Badge>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No videos yet.</p>
                                <Button variant="link" asChild className="mt-2">
                                    <Link href="/dashboard/create">Create your first video</Link>
                                </Button>
                            </div>
                        )}
                        <Button variant="ghost" className="w-full text-zinc-500 text-xs mt-2" asChild>
                            <Link href="/dashboard/projects">
                                View all projects
                                <ArrowUpRight className="w-3 h-3 ml-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
