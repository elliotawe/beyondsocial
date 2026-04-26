import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { z } from "zod";

const UpdateCreditsSchema = z.object({
    userId: z.string(),
    newCredits: z.number().nonnegative(),
});

async function ensureAdmin() {
    const session = await auth();
    if (!session?.user?.email) return null;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== "admin") return null;
    return user;
}

export async function PATCH(req: NextRequest) {
    try {
        const admin = await ensureAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = UpdateCreditsSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error.issues }, { status: 400 });
        }

        const { userId, newCredits } = result.data;

        const user = await User.findByIdAndUpdate(userId, { credits: newCredits }, { new: true });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API Admin Update Credits] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
