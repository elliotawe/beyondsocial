"use client"

import { refineVideoIdea, generateWanVideo, getWanVideoStatus, RefinedScript } from "@/app/actions/ai-video";
import { uploadImage } from "@/app/actions/cloudinary";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Check, ImageIcon, Loader2, Play, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
// import { Button } from "react-day-picker";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";

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
    const [isRefining, setIsRefining] = useState(false);
    const [refinedScript, setRefinedScript] = useState<RefinedScript | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRefine = async () => {
        if (!roughIdea.trim()) return;
        setIsRefining(true);
        setError(null);
        try {
            const result = await refineVideoIdea(roughIdea);
            setRefinedScript(result);
            setStep(2);
        } catch (error: any) {
            console.error(error);
            setError(error.message || "Something went wrong during refinement.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesSelected = e.target.files;
        if (filesSelected && filesSelected.length > 0) {
            const files = Array.from(filesSelected);
            setIsUploading(true);
            setError(null);

            try {
                const uploadPromises = files.map(async (file) => {
                    try {
                        // Check dimensions
                        const { width, height } = await getImageDimensions(file);

                        if (width < 240 || height < 240 || width > 7680 || height > 7680) {
                            const dimMsg = `Image "${file.name}" dimensions (${width}x${height}) are invalid. Must be between 240px and 7680px.`;
                            alert(dimMsg);
                            throw new Error(dimMsg);
                        }

                        // Start upload
                        return new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                                try {
                                    if (event.target?.result) {
                                        const url = await uploadImage(event.target.result as string);
                                        resolve(url);
                                    } else {
                                        reject(new Error("File reader result is empty"));
                                    }
                                } catch (err: any) {
                                    const uploadErrMsg = `Cloudinary upload failed for "${file.name}": ${err.message || "Unknown error"}`;
                                    alert(uploadErrMsg);
                                    reject(new Error(uploadErrMsg));
                                }
                            };
                            reader.onerror = () => {
                                const readErrMsg = `Failed to read file: ${file.name}`;
                                alert(readErrMsg);
                                reject(new Error(readErrMsg));
                            };
                            reader.readAsDataURL(file);
                        });
                    } catch (err: any) {
                        // Re-throw to be caught by Promise.all
                        throw err;
                    }
                });

                const urls = await Promise.all(uploadPromises);
                setUploadedImages(prev => [...prev, ...urls]);
            } catch (err: any) {
                console.error("Upload process error:", err);
                setError(err.message || "An error occurred during image selection/upload.");
            } finally {
                setIsUploading(false);
                // Clear the input so the same file can be selected again
                e.target.value = "";
            }
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!uploadedImages.length || !refinedScript) return;
        setIsGenerating(true);
        setError(null);

        try {
            const prompt = refinedScript.scenes.map(s => s.visual_direction).join(". ");
            const result = await generateWanVideo(uploadedImages[0], prompt);
            setTaskId(result.taskId);
            pollStatus(result.taskId);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to start video generation.");
            setIsGenerating(false);
        }
    };

    const pollStatus = async (id: string) => {
        const interval = setInterval(async () => {
            try {
                const result = await getWanVideoStatus(id);

                if (result.status === "SUCCEEDED") {
                    clearInterval(interval);
                    setGeneratedVideo(result.videoUrl);
                    setIsGenerating(false);
                    setStep(4);
                } else if (result.status === "FAILED") {
                    clearInterval(interval);
                    setError(result.message || "Video generation failed.");
                    setIsGenerating(false);
                }
            } catch (err) {
                console.error("Polling error:", err);
                clearInterval(interval);
                setIsGenerating(false);
                setError("Lost connection to generation task.");
            }
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

            {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-500 rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {step === 1 && (
                <Card className="border border-border shadow-lg bg-card/50 backdrop-blur-xl">
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
                <Card className="border border-border shadow-lg bg-card/50 backdrop-blur-xl">
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
