import { Schema, model, models } from "mongoose";

const SceneSchema = new Schema({
    scene_id: Number,
    role: String,
    duration_seconds: Number,
    script: String,
    visual_direction: String,
});

const ProjectSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        status: {
            type: String,
            enum: ["draft", "queued", "processing", "completed", "failed"],
            default: "draft",
        },
        error: String,                       // failure reason written by Inngest on failed status

        // AI Data
        roughIdea: String,
        script: {
            video_style: String,
            tone: String,
            scenes: [SceneSchema],
            cta: String,
        },

        // Assets
        uploadedImages: [String],
        generatedVideoUrl: String,
        videoUrl: String,                    // final composed video URL (Shotstack output)
        cloudinaryUrl: String,
        cloudinaryPublicId: String,
        taskId: String,                      // legacy Wan AI Task ID (kept for existing records)

        // Premium pipeline assets
        videoType: { type: String, enum: ["person", "product", "property"], default: "person" },
        portraitImageUrl: String,            // headshot for avatar (person-led videos only)
        avatarClipUrl: String,               // Creatify Aurora output
        brollClipUrls: [String],             // Kling 2.5 outputs, one per image
        generationEngine: String,            // e.g. "creatify-aurora+kling-2.5+shotstack"
        scenePlan: { type: Object },         // planScenes() output
        renderId: String,                    // Shotstack render ID
        industry: String,                    // industry from discovery step
        voice: String,                       // voice preference

        // Metadata
        aspectRatio: { type: String, default: "9:16" },
        duration: Number,

        // Scheduling & Social
        scheduledAt: Date,
        socialPlatforms: [String],
        socialStatus: {
            type: String,
            enum: ["idle", "scheduled", "posted", "failed"],
            default: "idle",
        },

        // Analytics
        analytics: {
            views: { type: Number, default: 0 },
            engagement: { type: Number, default: 0 },
            shares: { type: Number, default: 0 },
        },
        performanceScore: { type: Number, default: 0 },
        retryCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Indexes for performance
ProjectSchema.index({ userId: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ socialStatus: 1 });
ProjectSchema.index({ scheduledAt: 1 });

export const Project = models.Project || model("Project", ProjectSchema);
