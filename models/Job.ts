import { Schema, model, models } from "mongoose";

const JobSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: {
            type: String,
            enum: ["video_generation", "social_post"],
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending"
        },
        payload: { type: Schema.Types.Mixed },
        result: { type: Schema.Types.Mixed },
        error: String,
        providerTaskId: String,              // legacy Wan AI Task ID
        projectId: { type: Schema.Types.ObjectId, ref: "Project" },

        // Premium pipeline fields
        avatarRequestId: String,             // fal.ai requestId for Creatify Aurora
        brollRequestIds: [String],           // fal.ai requestIds for Kling, one per submitted clip
        // Parallel metadata array — maps each requestId to its scene data for correct ordering
        brollPlanItems: [{
            requestId: String,
            imageUrl: String,
            order: Number,
            durationSeconds: Number,
        }],
        totalClips: { type: Number, default: 0 },
        completedClips: { type: Number, default: 0 },
        renderId: String,                    // Shotstack render ID
    },
    { timestamps: true }
);

JobSchema.index({ projectId: 1 });
JobSchema.index({ renderId: 1 });
JobSchema.index({ avatarRequestId: 1 });
JobSchema.index({ status: 1 });

export const Job = models.Job || model("Job", JobSchema);
