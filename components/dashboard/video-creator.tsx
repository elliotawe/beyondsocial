"use client"

import { refineVideoIdea, createVideoGenerationJob, getProjectStatus, RefinedScript } from "@/app/actions/ai-video";
import { uploadImage } from "@/app/actions/cloudinary";
import { createProjectDraft, updateProjectDraft } from "@/app/actions/projects";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Check, ImageIcon, Loader2, Play, Sparkles, Wand2, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Could not load image properties: ${file.name}. Please ensure it is a valid image file.`));
        };
        img.src = objectUrl;
    });
};

export function VideoCreator() {
    const [step, setStep] = useState(1);
    const [roughIdea, setRoughIdea] = useState("");
    const [style, setStyle] = useState("cinematic");
    const [tone, setTone] = useState("professional");
    const [isRefining, setIsRefining] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [refinedScript, setRefinedScript] = useState<RefinedScript | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRefine = async () => {
        if (!roughIdea.trim()) return;
        setIsRefining(true);
        setError(null);
        try {
            // 1. Create a draft in DB first
            const { projectId: newProjectId } = await createProjectDraft({
                title: roughIdea.slice(0, 30) + "...",
                roughIdea,
                style,
                tone
            });
            setProjectId(newProjectId);

            // 2. Refine the idea
            const result = await refineVideoIdea(roughIdea, style, tone);
            setRefinedScript(result);

            // 3. Update project with the refined script
            await updateProjectDraft(newProjectId, { script: result });

            setStep(2);
        } catch (error: any) {
            console.error(error);
            setError(error.message || "Something went wrong during refinement.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!projectId || !refinedScript) return;
        setIsSaving(true);
        try {
            await updateProjectDraft(projectId, {
                script: refinedScript,
                uploadedImages: uploadedImages
            });
            // Show some success toast/feedback
        } catch (err: any) {
            setError(err.message || "Failed to save draft.");
        } finally {
            setIsSaving(false);
        }
    };

    const updateScene = (index: number, field: "script" | "visual_direction", value: string) => {
        if (!refinedScript) return;
        const newScenes = [...refinedScript.scenes];
        newScenes[index] = { ...newScenes[index], [field]: value };
        setRefinedScript({ ...refinedScript, scenes: newScenes });
    };

    const updateCTA = (value: string) => {
        if (!refinedScript) return;
        setRefinedScript({ ...refinedScript, cta: value });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesSelected = e.target.files;
        if (filesSelected && filesSelected.length > 0) {
            const files = Array.from(filesSelected);
            setIsUploading(true);
            setError(null);

            try {
                const uploadPromises = files.map(async (file) => {
                    const { width, height } = await getImageDimensions(file);
                    if (width < 240 || height < 240 || width > 7680 || height > 7680) {
                        throw new Error(`Image "${file.name}" dimensions (${width}x${height}) are invalid. Must be between 240px and 7680px.`);
                    }

                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                            if (event.target?.result) {
                                try {
                                    const url = await uploadImage(event.target.result as string);
                                    resolve(url);
                                } catch (err: any) {
                                    reject(new Error(`Upload failed for "${file.name}": ${err.message}`));
                                }
                            }
                        };
                        reader.readAsDataURL(file);
                    });
                });

                const urls = await Promise.all(uploadPromises);
                setUploadedImages(prev => [...prev, ...urls]);
            } catch (err: any) {
                setError(err.message || "An error occurred during image upload.");
            } finally {
                setIsUploading(false);
                e.target.value = "";
            }
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!uploadedImages.length || !refinedScript || !projectId) return;
        setIsGenerating(true);
        setError(null);

        try {
            // Update draft one last time before converting to job
            await updateProjectDraft(projectId, {
                script: refinedScript,
                uploadedImages: uploadedImages
            });

            const prompt = refinedScript.scenes.map(s => s.visual_direction).join(". ");

            // Reusing the projectId in the job creation if possible, or mapping them
            const jobResult = await createVideoGenerationJob(uploadedImages[0], prompt, {
                ...refinedScript,
                roughIdea,
                projectId // Pass existing projectId to associate
            });

            setStep(3);
            pollStatus(jobResult.projectId);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to start video generation.");
            setIsGenerating(false);
        }
    };

    const pollStatus = async (id: string) => {
        const interval = setInterval(async () => {
            try {
                const result = await getProjectStatus(id);

                if (result.status === "completed" && result.videoUrl) {
                    clearInterval(interval);
                    setGeneratedVideo(result.videoUrl);
                    setIsGenerating(false);
                    setStep(4);
                } else if (result.status === "failed") {
                    clearInterval(interval);
                    setError("Video generation failed on the server.");
                    setIsGenerating(false);
                }
            } catch (err: any) {
                console.error("Polling error:", err);
                if (err.message?.includes("not found")) {
                    clearInterval(interval);
                    setIsGenerating(false);
                    setError("Project lost.");
                }
            }
        }, 3000);
    };

    // ...

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8">
            {/* Stepper ... */}

            {step === 1 && (
                <Card className="border border-border shadow-lg bg-card/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-primary" />
                            Start with an Idea
                        </CardTitle>
                        <CardDescription>
                            Configure your video style and tone to guide the AI.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Style</label>
                                <Select value={style} onValueChange={setStyle}>
                                    <SelectTrigger className="bg-background/50 border-border/40">
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cinematic">Cinematic</SelectItem>
                                        <SelectItem value="vlog">Vlog Style</SelectItem>
                                        <SelectItem value="minimalist">Minimalist</SelectItem>
                                        <SelectItem value="vibrant">Vibrant & Pop</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tone</label>
                                <Select value={tone} onValueChange={setTone}>
                                    <SelectTrigger className="bg-background/50 border-border/40">
                                        <SelectValue placeholder="Select tone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="humorous">Humorous</SelectItem>
                                        <SelectItem value="inspiring">Inspiring</SelectItem>
                                        <SelectItem value="urgency">Urgency / Sales</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

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
                <Card className="border border-border shadow-lg bg-card/50 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <Check className="w-6 h-6 text-primary" />
                                Edit Script
                            </CardTitle>
                            <CardDescription>
                                Modify the AI-generated scenes to match your vision perfectly.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Draft
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {refinedScript.scenes.map((scene, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-border/40 bg-background/30 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Badge variant="outline" className="text-xs uppercase font-bold text-primary">
                                            Scene {scene.scene_id} ({scene.role})
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{scene.duration_seconds}s</span>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">Voiceover Script</label>
                                        <Textarea
                                            value={scene.script}
                                            onChange={(e) => updateScene(idx, "script", e.target.value)}
                                            className="bg-background/50 border-none focus-visible:ring-1 min-h-[60px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">Visual Direction (AI Prompt)</label>
                                        <Textarea
                                            value={scene.visual_direction}
                                            onChange={(e) => updateScene(idx, "visual_direction", e.target.value)}
                                            className="bg-background/20 border-none focus-visible:ring-1 italic text-xs min-h-[40px]"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 rounded-xl border border-dashed border-primary/20 bg-primary/5 space-y-2">
                            <label className="text-xs font-bold text-primary uppercase">Call to Action (CTA)</label>
                            <input
                                value={refinedScript.cta}
                                onChange={(e) => updateCTA(e.target.value)}
                                className="w-full bg-transparent border-none font-medium focus:outline-none p-0"
                            />
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
                <Card className="border border-border shadow-lg bg-card/50 backdrop-blur-xl">
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
                                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                onChange={handleImageUpload}
                                disabled={isUploading}
                            />
                            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                {isUploading ? (
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-primary" />
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-lg">
                                    {isUploading ? "Uploading images..." : "Click to upload or drag and drop"}
                                </p>
                                <p className="text-sm text-muted-foreground">PNG, JPG, or WEBP (max 5MB each)</p>
                            </div>
                        </div>

                        {uploadedImages.length > 0 && (
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                                {uploadedImages.map((url, i) => (
                                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border/40 group relative">
                                        <img src={url} alt="Uploaded" className="object-cover w-full h-full" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8 rounded-full"
                                                onClick={() => removeImage(i)}
                                            >
                                                <Check className="w-4 h-4 rotate-45" /> {/* Using Check rotated for an X since I didn't import X, or I can import it */}
                                            </Button>
                                        </div>
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
                <Card className="border border-border shadow-lg bg-card/50 backdrop-blur-xl">
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
                        <div className="aspect-9/16 max-w-[300px] mx-auto bg-black rounded-3xl overflow-hidden shadow-2xl ring-4 ring-primary/20">
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
