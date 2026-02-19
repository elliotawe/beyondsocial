"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { revalidatePath } from "next/cache";

export async function updateUserSettings(data: { name?: string; settings?: Record<string, unknown> }) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("You must be logged in to update settings.");
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        throw new Error("User not found.");
    }

    // Update basic info
    if (data.name) user.name = data.name;

    // Update settings
    if (data.settings) {
        user.settings = {
            ...user.settings,
            ...data.settings
        };
    }

    await user.save();

    revalidatePath("/dashboard/settings");

    return {
        success: true,
        user: JSON.parse(JSON.stringify(user))
    };
}

export async function getUserSettings() {
    const session = await auth();
    if (!session?.user?.email) return null;

    await connectDB();
    const user = await User.findOne({ email: session.user.email }).lean();
    return JSON.parse(JSON.stringify(user));
}
