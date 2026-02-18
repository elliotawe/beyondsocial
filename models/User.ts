import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
    {
        name: { type: String },
        email: { type: String, unique: true, required: true },
        emailVerified: { type: Date },
        image: { type: String },

        // Custom SaaS Fields
        stripeCustomerId: { type: String },
        planTier: { type: String, default: "free", enum: ["free", "pro", "business"] },
        credits: { type: Number, default: 5 }, // Default 5 free credits
        role: { type: String, default: "user", enum: ["user", "admin"] },
        password: { type: String },

        // NextAuth Fields
        accounts: [{ type: Schema.Types.ObjectId, ref: "Account" }],
        sessions: [{ type: Schema.Types.ObjectId, ref: "Session" }],
    },
    { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
