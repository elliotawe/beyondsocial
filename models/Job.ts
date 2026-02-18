import mongoose, { Schema, model, models } from "mongoose";

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
        payload: { type: Schema.Types.Mixed }, // Flexible payload
        result: { type: Schema.Types.Mixed },
        error: String,
        providerTaskId: String, // External ID (e.g. Wan AI ID)
    },
    { timestamps: true }
);

export const Job = models.Job || model("Job", JobSchema);
