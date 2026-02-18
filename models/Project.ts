import mongoose, { Schema, model, models } from "mongoose";

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
            enum: ["draft", "processing", "completed", "failed"],
            default: "draft",
        },

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
        taskId: String, // Wan AI Task ID

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
