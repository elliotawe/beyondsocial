import { auth } from "@/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { getAdminStats, getAllUsers } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Video, Activity, ShieldCheck, Mail, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AdminOverview() {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    await connectDB();
    const currentUser = await User.findOne({ email: session.user.email });

    // Safety check for role (though middleware/layout should handle this)
    if (!currentUser || currentUser.role !== "admin") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <ShieldCheck className="w-16 h-16 text-red-500" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have administrative privileges.</p>
                <Button variant="outline" asChild>
                    <a href="/dashboard">Back to Dashboard</a>
                </Button>
            </div>
        );
    }

    const stats = await getAdminStats();
    const users = await getAllUsers();

    const statCards = [
        { title: "Total Platform Users", value: stats.totalUsers.toLocaleString(), icon: Users, trend: "Live", color: "text-blue-500" },
        { title: "Videos Generated", value: stats.totalProjects.toLocaleString(), icon: Video, trend: "Real-time", color: "text-purple-500" },
        { title: "Background Jobs", value: stats.totalJobs.toLocaleString(), icon: Activity, trend: "Status: Active", color: "text-emerald-500" },
        { title: "Active (24h)", value: stats.activeUsers.toLocaleString(), icon: TrendingUp, trend: "User Pulse", color: "text-orange-500" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Overview</h1>
                <p className="text-muted-foreground">Real-time health and growth metrics for Beyond Social.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm dark:bg-zinc-900/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                            <stat.icon className={cn("w-4 h-4", stat.color)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-[10px] text-muted-foreground pt-1 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                                {stat.trend}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                <Card className="lg:col-span-4 border-none shadow-sm dark:bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle>User Management Summary</CardTitle>
                        <CardDescription>Recently registered users and tiers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-border -mt-4">
                            {users.slice(0, 6).map((user: any) => (
                                <div key={user._id} className="py-3 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                            {user.name?.[0] || user.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{user.name || "Anonymous"}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                            {user.planTier}
                                        </Badge>
                                        <p className="text-xs font-mono">{user.credits} CR</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full mt-4 text-xs font-medium" asChild>
                            <a href="/admin/users">View all users</a>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-none shadow-sm dark:bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle>Recent Job Activity</CardTitle>
                        <CardDescription>Last 5 background tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {stats.recentJobs.map((job: any) => (
                            <div key={job._id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold capitalize">{job.type.replace('_', ' ')}</p>
                                    <p className="text-[10px] text-muted-foreground">{new Date(job.createdAt).toLocaleTimeString()}</p>
                                </div>
                                <Badge variant="secondary" className={cn(
                                    "text-[9px] uppercase font-bold",
                                    job.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                        job.status === "failed" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                            "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                )}>
                                    {job.status}
                                </Badge>
                            </div>
                        ))}
                        <Button variant="ghost" className="w-full mt-2 text-xs font-medium" asChild>
                            <a href="/admin/jobs">Queue monitor</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

