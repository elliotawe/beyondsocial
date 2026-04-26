import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ success: true, events: [] });
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ success: true, events: [] });

        const projects = await Project.find({
            userId: user._id,
            $or: [
                { scheduledAt: { $ne: null } },
                { socialStatus: "posted" }
            ]
        }).lean();

        const events = projects.map((p: Record<string, unknown>) => ({
            _id: String(p._id),
            title: p.title,
            date: p.scheduledAt || p.updatedAt,
            status: p.socialStatus || "idle",
            thumbnail: (p.uploadedImages as string[])?.[0] || null
        }));

        return NextResponse.json({
            success: true,
            events
        });
    } catch (error) {
        console.error("[API Project Calendar] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
