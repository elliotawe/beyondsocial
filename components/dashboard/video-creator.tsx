"use client";

import React, { useState } from "react";
import { Sparkles, Image as ImageIcon, Wand2, ArrowRight, Check, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { refineIdea, RefinedScript } from "@/lib/ai-actions";
import { cn } from "@/lib/utils";

export function VideoCreator() {
    const [step, setStep] = useState(1);
    const [roughIdea, setRoughIdea] = useState("");
    const [isRefining, setIsRefining] = useState(false);
    const [refinedScript, setRefinedScript] = useState<RefinedScript | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);

    const handleRefine = async () => {
        if (!roughIdea.trim()) return;
        setIsRefining(true);
        try {
            const result = await refineIdea(roughIdea);
            setRefinedScript(result);
            setStep(2);
        } catch (error) {
            console.error(error);
        } finally {
            setIsRefining(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Simple placeholder for image upload
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const urls = files.map(file => URL.createObjectURL(file));
            setUploadedImages(prev => [...prev, ...urls]);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        // Simulate generation delay
        setTimeout(() => {
            setIsGenerating(false);
            setGeneratedVideo("https://www.w3schools.com/html/mov_bbb.mp4"); // Dummy video
            setStep(4);
        }, 3000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8">
            {/* Stepper */}
            <div className="flex justify-between items-center px-4 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border/40 -z-10" />
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                            step >= s ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border text-muted-foreground"
                        )}
                    >
                        {step > s ? <Check className="w-5 h-5" /> : s}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <Card className="border-border/40 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-primary" />
                            Start with an Idea
                        </CardTitle>
                        <CardDescription>
                            Tell Beyond what kind of video you want to create. Our AI Refinement Engine will handle the rest.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="e.g., A 15-second video explaining why small businesses need a digital social media manager..."
                            className="min-h-[150px] text-lg p-4 bg-background/50 border-border/40"
                            value={roughIdea}
                            onChange={(e) => setRoughIdea(e.target.value)}
                        />
                        <Button
                            onClick={handleRefine}
                            disabled={isRefining || !roughIdea.trim()}
                            className="w-full h-12 text-lg font-semibold rounded-xl"
                        >
                            {isRefining ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Refining with AI...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-5 h-5 mr-2" />
                                    Refine Idea
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {step === 2 && refinedScript && (
                <Card className="border-border/40 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <Check className="w-6 h-6 text-primary" />
                            Refined Video Script
                        </CardTitle>
                        <CardDescription>
                            Our AI has structured your idea into a professional social media script.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex gap-4">
                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                Style: {refinedScript.video_style}
                            </Badge>
                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                Tone: {refinedScript.tone}
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            {refinedScript.scenes.map((scene) => (
                                <div key={scene.scene_id} className="p-4 rounded-xl border border-border/40 bg-background/30 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Scene {scene.scene_id} ({scene.role})</span>
                                        <span className="text-xs text-muted-foreground">{scene.duration_seconds}s</span>
                                    </div>
                                    <p className="font-medium">{scene.script}</p>
                                    <p className="text-xs text-muted-foreground italic">Visual: {scene.visual_direction}</p>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 rounded-xl border border-dashed border-primary/20 bg-primary/5">
                            <p className="text-sm font-bold text-primary">CTA: {refinedScript.cta}</p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl">
                                Back to Idea
                            </Button>
                            <Button onClick={() => setStep(3)} className="flex-1 rounded-xl">
                                Next: Add Images
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 3 && (
                <Card className="border-border/40 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <ImageIcon className="w-6 h-6 text-primary" />
                            Reference Images
                        </CardTitle>
                        <CardDescription>
                            Upload images for the Wan AI 2.6 engine. These will be transformed into high-quality video clips.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div
                            className="border-2 border-dashed border-border/40 rounded-2xl p-12 text-center space-y-4 hover:border-primary/50 transition-colors cursor-pointer relative"
                        >
                            <input
                                type="file"
                                multiple
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleImageUpload}
                            />
                            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">Click to upload or drag and drop</p>
                                <p className="text-sm text-muted-foreground">PNG, JPG, or WEBP (max 5MB each)</p>
                            </div>
                        </div>

                        {uploadedImages.length > 0 && (
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                                {uploadedImages.map((url, i) => (
                                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border/40 group relative">
                                        <img src={url} alt="Uploaded" className="object-cover w-full h-full" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-xl">
                                Back to Script
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || uploadedImages.length === 0}
                                className="flex-1 rounded-xl"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating Video...
                                    </>
                                ) : (
                                    <>
                                        Generate Video
                                        <Play className="w-4 h-4 ml-2 fill-current" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 4 && generatedVideo && (
                <Card className="border-border/40 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-2xl font-bold">Video Ready!</CardTitle>
                                <CardDescription>Your video has been generated using Wan AI 2.6.</CardDescription>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-500 border-none px-4 py-1">
                                Complete
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="aspect-[9/16] max-w-[300px] mx-auto bg-black rounded-3xl overflow-hidden shadow-2xl ring-4 ring-primary/20">
                            <video
                                src={generatedVideo}
                                controls
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                            />
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <Button className="w-full rounded-xl h-12 text-lg font-bold">
                                Download Video
                            </Button>
                            <Button variant="outline" className="w-full rounded-xl h-12" onClick={() => setStep(1)}>
                                Create Another
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
