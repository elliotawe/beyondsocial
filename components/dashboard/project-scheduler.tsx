"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Clock, Share2, Check, AlertCircle, Loader2 } from "lucide-react";
import { scheduleProjectPost, cancelProjectSchedule } from "@/app/actions/projects";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ProjectSchedulerProps {
    projectId: string;
    initialScheduledAt: string | null;
    initialPlatforms: string[];
    socialStatus: string;
}

const PLATFORMS = [
    { id: "tiktok", name: "TikTok", color: "text-[#EE1D52]" },
    { id: "instagram", name: "Instagram", color: "text-[#E1306C]" },
    { id: "youtube", name: "YouTube Shorts", color: "text-[#FF0000]" },
];

export function ProjectScheduler({
    projectId,
    initialScheduledAt,
    initialPlatforms,
    socialStatus: initialSocialStatus,
}: ProjectSchedulerProps) {
    const [scheduledAt, setScheduledAt] = useState<string>(
        initialScheduledAt ? initialScheduledAt.slice(0, 16) : ""
    );
    const [platforms, setPlatforms] = useState<string[]>(initialPlatforms);
    const [socialStatus, setSocialStatus] = useState(initialSocialStatus);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const togglePlatform = (id: string) => {
        setPlatforms((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    };

    const handleSchedule = async () => {
        if (!scheduledAt) {
            setError("Please select a date and time.");
            return;
        }
        if (platforms.length === 0) {
            setError("Please select at least one platform.");
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            await scheduleProjectPost(projectId, {
                scheduledAt,
                platforms,
            });
            setSocialStatus("scheduled");
        } catch (err: any) {
            setError(err.message || "Failed to schedule post.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await cancelProjectSchedule(projectId);
            setSocialStatus("idle");
            setScheduledAt("");
        } catch (err: any) {
            setError(err.message || "Failed to cancel schedule.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="border-border/60 shadow-lg bg-card/50 backdrop-blur-xl">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-primary" />
                            Social Scheduler
                        </CardTitle>
                        <CardDescription>
                            Schedule your generated video to post automatically.
                        </CardDescription>
                    </div>
                    {socialStatus === "scheduled" && (
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3">
                            Scheduled
                        </Badge>
                    )}
                    {socialStatus === "posted" && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3">
                            Posted
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="schedule-time" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Date & Time
                            </Label>
                            <input
                                id="schedule-time"
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="w-full bg-background/50 border border-border/40 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                                disabled={socialStatus === "posted" || isSaving}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Target Platforms</Label>
                        <div className="space-y-2">
                            {PLATFORMS.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-background/20 hover:bg-background/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm ${p.color}`}>
                                            <Share2 className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium">{p.name}</span>
                                    </div>
                                    <Switch
                                        checked={platforms.includes(p.id)}
                                        onCheckedChange={() => togglePlatform(p.id)}
                                        disabled={socialStatus === "posted" || isSaving}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {socialStatus === "scheduled" ? (
                    <div className="space-y-3">
                        <p className="text-xs text-muted-foreground text-center">
                            Scheduled for {format(new Date(scheduledAt), "PPP p")}
                        </p>
                        <Button
                            variant="outline"
                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Cancel Schedule"}
                        </Button>
                    </div>
                ) : (
                    <Button
                        className="w-full h-11 font-bold rounded-xl"
                        onClick={handleSchedule}
                        disabled={socialStatus === "posted" || isSaving || platforms.length === 0}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <>
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                Schedule Post
                            </>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
