import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
    {
        name: { type: String },
        email: { type: String, unique: true, required: true },
        emailVerified: { type: Date },
        image: { type: String },

        // Custom SaaS Fields
        stripeCustomerId: { type: String },
        planTier: { type: String, default: "free", enum: ["free", "pro", "business"] },
        credits: { type: Number, default: 15 },
        monthlyCreditsUsed: { type: Number, default: 0 },
        lastCreditReset: { type: Date, default: null },
        role: { type: String, default: "user", enum: ["user", "admin"] },
        password: { type: String },

        // NextAuth Fields
        accounts: [{ type: Schema.Types.ObjectId, ref: "Account" }],
        sessions: [{ type: Schema.Types.ObjectId, ref: "Session" }],

        // Settings & Preferences
        settings: {
            autoHashtags: { type: Boolean, default: true },
            smartCaptionLength: { type: Boolean, default: true },
            experimentalVideoStyles: { type: Boolean, default: false },
            notifications: {
                email: { type: Boolean, default: true },
                push: { type: Boolean, default: true }
            }
        }
    },
    { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
