"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
    Card, CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Calendar, Film, Image as ImageIcon, Loader2, Eye, Share2
} from "lucide-react";
import { toast } from "sonner";

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

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchProjects() {
            try {
                const res = await fetch("/api/projects");
                if (!res.ok) throw new Error("Failed to fetch projects");
                const data = await res.json();
                setProjects(data.projects);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load projects");
            } finally {
                setIsLoading(false);
            }
        }
        fetchProjects();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">My Projects</h1>
                    <p className="text-muted-foreground">Manage and view your video creations.</p>
                </div>
                <Button asChild className="rounded-xl">
                    <Link href="/dashboard/create">
                        <Film className="w-4 h-4 mr-2" />
                        Create New
                    </Link>
                </Button>
            </div>

            {projects.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/10">
                    <CardContent className="flex flex-col items-center justify-center h-[400px] text-center p-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Film className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No projects yet</h3>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            Start creating your first AI-generated video to see it here.
                        </p>
                        <Button asChild size="lg" className="rounded-xl">
                            <Link href="/dashboard/create">Create Video</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project: Project) => (
                        <Link key={project._id} href={`/dashboard/projects/${project._id}`} className="group block">
                            <Card className="overflow-hidden border-border/60 hover:border-primary/50 transition-colors h-full flex flex-col">
                                <div className="aspect-video bg-muted relative overflow-hidden">
                                    {project.thumbnail ? (
                                        <Image
                                            src={project.thumbnail}
                                            alt={project.title}
                                            fill
                                            className="object-cover border-none"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />

                                    <div className="absolute top-3 right-3">
                                        <Badge className={cn(
                                            "bg-background/90 backdrop-blur-sm border shadow-sm",
                                            project.status === "completed" ? "text-emerald-600 border-emerald-200" :
                                                project.status === "processing" ? "text-blue-600 border-blue-200 animate-pulse" :
                                                    "text-muted-foreground border-border"
                                        )}>
                                            {project.status}
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-5 flex-1">
                                    <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                        {project.title}
                                    </h3>
                                    <div className="flex items-center flex-wrap text-xs text-muted-foreground gap-3 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />
                                            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {(project.analytics?.views > 0) && (
                                            <div className="flex items-center gap-1.5">
                                                <Eye className="w-3 h-3" />
                                                <span>{project.analytics.views.toLocaleString()} views</span>
                                            </div>
                                        )}
                                        {(project.analytics?.shares > 0) && (
                                            <div className="flex items-center gap-1.5">
                                                <Share2 className="w-3 h-3" />
                                                <span>{project.analytics.shares} shares</span>
                                            </div>
                                        )}
                                    </div>
                                    {project.socialStatus && project.socialStatus !== "none" && (
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] font-black uppercase tracking-widest border-none px-2 py-0.5",
                                            project.socialStatus === "posted" ? "bg-emerald-500/10 text-emerald-500" :
                                            project.socialStatus === "scheduled" ? "bg-blue-500/10 text-blue-500" :
                                            "bg-muted text-muted-foreground"
                                        )}>
                                            {project.socialStatus === "posted" ? "Published" : project.socialStatus}
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
