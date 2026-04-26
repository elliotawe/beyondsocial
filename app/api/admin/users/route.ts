import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";

async function ensureAdmin() {
    const session = await auth();
    if (!session?.user?.email) return null;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== "admin") return null;
    return user;
}

export async function GET() {
    try {
        const admin = await ensureAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const users = await User.find().sort({ createdAt: -1 }).lean();

        return NextResponse.json({
            success: true,
            users: users.map((u: Record<string, unknown>) => ({
                _id: String(u._id),
                name: u.name,
                email: u.email,
                planTier: u.planTier as "free" | "pro" | "business",
                credits: u.credits,
                role: u.role as "user" | "admin",
                createdAt: (u.createdAt as Date).toISOString()
            }))
        });
    } catch (error) {
        console.error("[API Admin Users] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
