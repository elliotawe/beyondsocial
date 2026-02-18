import { auth } from "@/auth";
import { getProjectById } from "@/app/actions/projects";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Download, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectScheduler } from "@/components/dashboard/project-scheduler";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    const project = await getProjectById(id);

    if (!project) {
        notFound();
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/projects">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold font-outfit">{project.title}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <Badge
                            variant="outline"
                            className={
                                project.status === "completed" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" :
                                    project.status === "processing" ? "text-blue-500 border-blue-500/20 bg-blue-500/10" :
                                        "text-muted-foreground"
                            }
                        >
                            {project.status}
                        </Badge>
                    </div>
                </div>
                {project.status === "completed" && project.videoUrl && (
                    <Button className="ml-auto gap-2" asChild>
                        <a href={project.videoUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                            Download
                        </a>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Video Player */}
                    <div className="aspect-9/16 bg-black rounded-3xl overflow-hidden shadow-2xl relative max-w-sm mx-auto lg:mx-0 lg:max-w-md ring-1 ring-border">
                        {project.videoUrl ? (
                            <video
                                src={project.videoUrl}
                                controls
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/10">
                                {project.status === "processing" ? (
                                    <>
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                        <p>Generating video...</p>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                                        <p>Video not available</p>
                                        <p className="text-sm opacity-70 mt-2">Status: {project.status}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {project.status === "completed" && (
                        <ProjectScheduler
                            projectId={project._id}
                            initialScheduledAt={project.scheduledAt}
                            initialPlatforms={project.socialPlatforms}
                            socialStatus={project.socialStatus}
                        />
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Script Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {project.script ? (
                                <>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary">Style: {project.script.video_style}</Badge>
                                        <Badge variant="secondary">Tone: {project.script.tone}</Badge>
                                    </div>
                                    <div className="space-y-4 mt-4">
                                        {project.script.scenes.map((scene: any) => (
                                            <div key={scene.scene_id} className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                                                <div className="flex justify-between font-semibold text-xs uppercase text-muted-foreground">
                                                    <span>Scene {scene.scene_id}</span>
                                                    <span>{scene.duration_seconds}s</span>
                                                </div>
                                                <p>{scene.script}</p>
                                                <p className="text-xs italic text-muted-foreground">{scene.visual_direction}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 mt-4">
                                        <p className="text-xs font-bold text-primary uppercase mb-1">Call to Action</p>
                                        <p className="text-sm font-medium">{project.script.cta}</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">No script data available.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
