import { Schema, model, models } from "mongoose";

const CreditTransactionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        amount: { type: Number, required: true }, // negative = deducted, positive = added/refunded
        reason: { type: String, required: true }, // human-readable description
        action: { type: String, required: true }, // machine key: discovery, video_generation, etc.
        balanceBefore: { type: Number, required: true },
        balanceAfter: { type: Number, required: true },
        projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    },
    { timestamps: true }
);

export const CreditTransaction = models.CreditTransaction || model("CreditTransaction", CreditTransactionSchema);
