"use client"

import { refineVideoIdea, createVideoGenerationJob, getProjectStatus } from "@/app/actions/ai-video";
import type { RefinedScript } from "@/lib/ai-service";
import { uploadImage } from "@/app/actions/cloudinary";
import { createProjectDraft, updateProjectDraft } from "@/app/actions/projects";
import { getIndustrySuggestions } from "@/app/actions/industries";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Check, ImageIcon, Loader2, Play, Sparkles, /* Wand2, */ Save, Plus, /* Mic, Paperclip, Globe, Search, ShoppingBag, Telescope, MoreHorizontal, ChevronDown, AudioLines, */ X, Share2, Download, ExternalLink } from "lucide-react";
import { useState /*, useRef, useEffect */ } from "react";
import { Button } from "../ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../ui/dropdown-menu";

const getMediaMetadata = (file: File): Promise<{ width: number; height: number; type: "image" | "video" }> => {
    return new Promise((resolve, reject) => {
        if (file.type.startsWith("video/")) {
            // For videos, we skip strict dimension checks for now or use a default
            resolve({ width: 0, height: 0, type: "video" });
            return;
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: img.width, height: img.height, type: "image" });
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
    // const [error, setError] = useState<string | null>(null);

    // Inspiration & Specialized Modes
    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [realEstateMode, setRealEstateMode] = useState(false);

    const handleIndustrySelect = async (industry: string) => {
        setSelectedIndustry(industry);
        setIsLoadingSuggestions(true);
        setRealEstateMode(industry === "Real Estate");
        try {
            const ideas = await getIndustrySuggestions(industry);
            setSuggestions(ideas);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

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
            const result = await refineVideoIdea(roughIdea, style, tone, selectedIndustry || undefined, realEstateMode);
            setRefinedScript(result);

            // 3. Update project with the refined script
            await updateProjectDraft(newProjectId, { script: result });

            setStep(2);
        } catch (error: unknown) {
            console.error(error);
            // setError(error instanceof Error ? error.message : "Something went wrong during refinement.");
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
        } catch (err: unknown) { // Changed to catch with err parameter
            setError((err as Error).message || "Failed to save draft.");
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
            setError(null); // Reset error on new upload attempt

            try {
                const uploadPromises = files.map(async (file) => {
                    const isVideo = file.type.startsWith("video/");

                    // 1. Check file size (Max 5MB for images, 15MB for videos)
                    const maxSize = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
                    if (file.size > maxSize) {
                        throw new Error(`File "${file.name}" is too large. Maximum size for ${isVideo ? 'video' : 'image'} is ${isVideo ? '15MB' : '5MB'}.`);
                    }

                    // 2. Check dimensions (Images only)
                    if (!isVideo) {
                        const { width, height } = await getMediaMetadata(file);
                        if (width < 240 || height < 240 || width > 7680 || height > 7680) {
                            throw new Error(`Image "${file.name}" dimensions (${width}x${height}) are invalid. Must be between 240px and 7680px.`);
                        }
                    }

                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                            if (event.target?.result) {
                                try {
                                    const url = await uploadImage(event.target.result as string);
                                    resolve(url);
                                } catch {
                                    reject(new Error(`Upload failed for "${file.name}": 502 Proxy Error. The file might be too complex or large for the server.`));
                                }
                            }
                        };
                        reader.readAsDataURL(file);
                    });
                });

                const urls = await Promise.all(uploadPromises);
                setUploadedImages(prev => [...prev, ...urls]);
            } catch (err: unknown) {
                setError((err as Error).message || "An error occurred during image upload.");
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
        setError(null); // Reset error on new generation attempt
        setIsGenerating(true);

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
        } catch (err: unknown) {
            console.error(err);
            setError((err as Error).message || "Failed to start video generation.");
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
            } catch (err: unknown) {
                console.error("Polling error:", err);
                if (err instanceof Error && err.message?.includes("not found")) { // Check if err is an Error object
                    clearInterval(interval);
                    setIsGenerating(false);
                    setError("Project lost.");
                } else {
                    setError("An unexpected error occurred during polling.");
                }
            }
        }, 3000);
    };

    const resetCreator = () => {
        setStep(1);
        setRoughIdea("");
        setStyle("cinematic");
        setTone("professional");
        setRefinedScript(null);
        setUploadedImages([]);
        setGeneratedVideo(null);
        setProjectId(null);
        setError(null);
    };

    return (
        <div className="">
            {step === 1 && (
                <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
                    <div className="w-full max-w-3xl space-y-12">
                        {/* Header Section */}
                        <div className="text-center space-y-6">
                            <h1 className="text-5xl md:text-6xl font-bold tracking-tight font-outfit bg-linear-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
                                Ready when you are.
                            </h1>
                            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                                Upload an image and describe your idea to generate a cinematic video with Wan 2.6 Flash.
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive" className="max-w-xl mx-auto">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Industry Inspiration */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap justify-center gap-2">
                                {["Real Estate", "E-commerce", "Fitness", "Tech", "Lifestyle"].map((ind) => (
                                    <Button
                                        key={ind}
                                        variant={selectedIndustry === ind ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleIndustrySelect(ind)}
                                        className="rounded-full px-4 h-8 text-xs font-bold transition-all"
                                    >
                                        {ind}
                                    </Button>
                                ))}
                            </div>

                            {selectedIndustry && (
                                <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
                                    {isLoadingSuggestions ? (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Getting fresh ideas for {selectedIndustry}...
                                        </div>
                                    ) : (
                                        suggestions.map((sug, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setRoughIdea(sug);
                                                    // Trigger textarea resize
                                                    const textarea = document.querySelector('textarea');
                                                    if (textarea) {
                                                        textarea.style.height = 'auto';
                                                        textarea.style.height = textarea.scrollHeight + 'px';
                                                    }
                                                }}
                                                className="text-[11px] bg-primary/5 hover:bg-primary/10 border border-primary/10 text-primary px-3 py-1.5 rounded-full font-medium transition-colors"
                                            >
                                                {sug}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Image Upload Area */}
                        <div className="space-y-4">
                            <div
                                className={cn(
                                    "border-2 border-dashed border-border/60 hover:border-primary/50 rounded-[32px] p-8 text-center space-y-4 transition-all duration-500 bg-card/20 backdrop-blur-sm group relative overflow-hidden",
                                    uploadedImages.length > 0 && "border-primary/40 bg-primary/5"
                                )}
                            >
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <input
                                    type="file"
                                    multiple
                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                    onChange={handleImageUpload}
                                    disabled={isUploading}
                                    accept="image/*,video/mp4,video/quicktime"
                                />
                                <div className="relative z-0 mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                                    {isUploading ? (
                                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                                    ) : uploadedImages.length > 0 ? (
                                        <Check className="w-7 h-7 text-primary" />
                                    ) : (
                                        <ImageIcon className="w-7 h-7 text-primary" />
                                    )}
                                </div>
                                <div className="space-y-1 relative z-0">
                                    <h3 className="text-xl font-bold">
                                        {isUploading ? "Uploading..." : uploadedImages.length > 0 ? "Media Ready" : "Start with an image or video"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {uploadedImages.length > 0
                                            ? `${uploadedImages.length} file(s) uploaded. Click or drop to add more.`
                                            : realEstateMode ? "Upload property tour video or images" : "Drop your reference images or videos here"}
                                    </p>
                                    {uploadedImages.length === 0 && (
                                        <p className="text-[10px] text-primary/60 font-medium uppercase tracking-widest mt-2 px-3 py-1 bg-primary/10 rounded-full inline-block">
                                            {realEstateMode ? "Video Tours Recommended" : "Mandatory for generation"}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {uploadedImages.length > 0 && (
                                <div className="flex flex-wrap gap-3 justify-center">
                                    {uploadedImages.map((url, i) => (
                                        <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-border/50 group relative shadow-md">
                                            <img src={url} alt="Uploaded" className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-6 w-6 rounded-full"
                                                    onClick={() => removeImage(i)}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {realEstateMode && (
                                <Alert className="max-w-xl mx-auto bg-primary/5 border-primary/20 rounded-[20px] animate-in fade-in zoom-in">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <AlertTitle className="text-xs font-bold uppercase tracking-widest text-primary">Advanced Agent Mode</AlertTitle>
                                    <AlertDescription className="text-sm text-primary/80">
                                        Uploading a property tour video? Our AI will generate a script that inserts an agent avatar into your tour to explain the features.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        {/* Style & Tone Pills */}
                        <div className="flex flex-wrap justify-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {realEstateMode ? "Property Style" : "Style"}
                                </span>
                                <Select value={style} onValueChange={setStyle}>
                                    <SelectTrigger className="h-8 w-auto px-3 bg-card/50 border-border/40 text-xs rounded-full hover:bg-card/80 transition-colors">
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cinematic">Cinematic</SelectItem>
                                        <SelectItem value="vlog">Vlog Style</SelectItem>
                                        {realEstateMode && <SelectItem value="luxury">Luxury Estate</SelectItem>}
                                        <SelectItem value="minimalist">Minimalist</SelectItem>
                                        <SelectItem value="vibrant">Vibrant & Pop</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {realEstateMode ? "Agent Tone" : "Tone"}
                                </span>
                                <Select value={tone} onValueChange={setTone}>
                                    <SelectTrigger className="h-8 w-auto px-3 bg-card/50 border-border/40 text-xs rounded-full hover:bg-card/80 transition-colors">
                                        <SelectValue placeholder="Select tone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="humorous">Humorous</SelectItem>
                                        <SelectItem value="inspiring">Inspiring</SelectItem>
                                        <SelectItem value="urgency">Urgency / Sales</SelectItem>
                                        {realEstateMode && <SelectItem value="relatable">Warm & Relatable Agent</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Main Input Bar */}
                        <div className="relative group max-w-2xl mx-auto w-full">
                            <div className={cn(
                                "relative flex items-center gap-2 bg-card/60 backdrop-blur-xl rounded-[32px] p-2 pl-5 pr-3 border border-border/50 shadow-2xl transition-all duration-500 group-focus-within:ring-2 group-focus-within:ring-primary/30 group-focus-within:bg-card",
                                uploadedImages.length === 0 && "opacity-50 pointer-events-none grayscale"
                            )}>
                                {/* Input */}
                                <Textarea
                                    rows={1}
                                    placeholder={uploadedImages.length === 0 ? "Upload an image first..." : "e.g., A cinematic teaser for a luxury watch brand..."}
                                    className="flex-1 min-h-[52px] max-h-[200px] py-4 text-xl bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 resize-none font-medium"
                                    value={roughIdea}
                                    onChange={(e) => {
                                        setRoughIdea(e.target.value);
                                        e.target.style.height = "inherit";
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey && roughIdea.trim() && uploadedImages.length > 0) {
                                            e.preventDefault();
                                            handleRefine();
                                        }
                                    }}
                                />

                                {/* Send Action */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {(roughIdea.trim() || isRefining) && (
                                        <Button
                                            onClick={handleRefine}
                                            disabled={isRefining || uploadedImages.length === 0}
                                            size="icon"
                                            className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 transform scale-100 animate-in zoom-in"
                                        >
                                            {isRefining ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <ArrowRight className="h-6 w-6" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <p className="mt-6 text-center text-sm text-muted-foreground/40 font-medium">
                                Optimal size: 720P (1280x720) • Max file size: 5MB
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && refinedScript && (
                <div className="max-w-3xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                        <div>
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                <span className="bg-primary/20 p-2 rounded-lg"><Sparkles className="w-6 h-6 text-primary" /></span>
                                Refined Script
                            </h2>
                            <p className="text-muted-foreground mt-2">Modify the AI-generated scenes to match your vision perfectly.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="rounded-full px-4 text-xs font-bold uppercase tracking-wider">
                                Back to idea
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSaveDraft}
                                disabled={isSaving}
                                className="rounded-full px-6"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Progress
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {refinedScript.scenes.map((scene, idx) => (
                            <div key={idx} className="group relative bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6 transition-all duration-300 hover:border-primary/30 hover:bg-card/60">
                                <div className="flex justify-between items-center mb-6">
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-primary border-primary/20 px-2.5 py-0.5">
                                        Scene {scene.scene_id} • {scene.role}
                                    </Badge>
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 opacity-60">
                                        {scene.duration_seconds}s
                                    </span>
                                </div>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Voiceover</label>
                                        <Textarea
                                            value={scene.script}
                                            onChange={(e) => updateScene(idx, "script", e.target.value)}
                                            className="bg-transparent border-none focus-visible:ring-0 p-1 text-lg leading-relaxed placeholder:text-muted-foreground/30 min-h-[100px] resize-none"
                                        />
                                    </div>
                                    <div className="space-y-3 md:border-l md:border-border/30 md:pl-8">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Visual Direction</label>
                                        <Textarea
                                            value={scene.visual_direction}
                                            onChange={(e) => updateScene(idx, "visual_direction", e.target.value)}
                                            className="bg-transparent border-none focus-visible:ring-0 p-1 text-sm italic text-muted-foreground leading-relaxed placeholder:text-muted-foreground/30 min-h-[100px] resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-3">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Call to Action</label>
                        <input
                            value={refinedScript.cta}
                            onChange={(e) => updateCTA(e.target.value)}
                            className="w-full bg-transparent border-none text-xl font-bold text-foreground focus:outline-none placeholder:text-primary/20 p-1"
                            placeholder="Add your CTA..."
                        />
                    </div>

                    <div className="flex gap-4 pt-8">
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full h-16 rounded-full font-bold shadow-xl shadow-primary/20 group relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        Generating Cinematic Video...
                                    </>
                                ) : (
                                    <>
                                        Confirm & Generate Video
                                        <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                                    </>
                                )}
                            </span>
                        </Button>
                    </div>
                </div>
            )}


            {step === 3 && (
                <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
                    <div className="w-full max-w-3xl text-center space-y-12">
                        <div className="space-y-6">
                            <div className="relative mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            </div>
                            <h2 className="text-4xl font-bold tracking-tight">Creating your video</h2>
                            <p className="text-muted-foreground text-lg max-w-md mx-auto">
                                The Wan 2.6 Flash engine is processing your script and images. This usually takes about 60-90 seconds.
                            </p>
                        </div>

                        <div className="bg-card/40 border border-border/50 rounded-3xl p-8 max-w-lg mx-auto">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-muted-foreground">Status</span>
                                    <span className="text-primary animate-pulse">In Progress</span>
                                </div>
                                <div className="h-2 w-full bg-border/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary animate-[shimmer_2s_infinite] w-[60%]" />
                                </div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                                    Flash Generation Engine Active
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 4 && generatedVideo && (
                <div className="max-w-5xl mx-auto space-y-12 py-12 animate-in fade-in zoom-in duration-700">
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/5">
                            <Sparkles className="w-4 h-4" />
                            Production Complete
                        </div>
                        <h2 className="text-5xl font-bold tracking-tight font-outfit">Your Masterpiece is Ready</h2>
                        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                            The Wan 2.6 Flash engine has finished generating your high-fidelity social media content.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_350px] gap-12 items-start">
                        <div className="space-y-8">
                            <div className="aspect-video bg-black rounded-[40px] overflow-hidden shadow-2xl ring-1 ring-border/50 relative group">
                                <video
                                    src={generatedVideo}
                                    controls
                                    className="w-full h-full object-contain"
                                    autoPlay
                                    loop
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent pointer-events-none" />
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <Button size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-8 h-14 font-bold shadow-xl">
                                    <Download className="w-5 h-5 mr-2" />
                                    Download 4K
                                </Button>
                                <Button size="lg" variant="outline" className="rounded-full px-8 h-14 font-bold border-border/50 bg-card/40 backdrop-blur-sm">
                                    <Share2 className="w-5 h-5 mr-2" />
                                    Share to Socials
                                </Button>
                                <Button size="lg" variant="ghost" className="rounded-full px-8 h-14 font-bold hover:bg-muted">
                                    <ExternalLink className="w-5 h-5 mr-2" />
                                    View in Dashboard
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-[32px] p-8 space-y-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Generation Details</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-border/30">
                                        <span className="text-muted-foreground font-medium">Resolution</span>
                                        <span className="font-bold">1080x1920 (9:16)</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-border/30">
                                        <span className="text-muted-foreground font-medium">Model</span>
                                        <span className="font-bold">Wan AI 2.6 Flash</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-border/30">
                                        <span className="text-muted-foreground font-medium">Duration</span>
                                        <span className="font-bold">15 Seconds</span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={resetCreator}
                                className="w-full h-16 rounded-[32px] font-bold border-primary/20 hover:bg-primary/5 transition-all text-lg"
                            >
                                <Plus className="w-5 h-5 mr-3" />
                                Create Another Video
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
