import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdateSettingsSchema = z.object({
    name: z.string().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email }).lean();
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: JSON.parse(JSON.stringify(user))
        });
    } catch (error) {
        console.error("[API User Settings GET] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = UpdateSettingsSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error.issues }, { status: 400 });
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const data = result.data;
        if (data.name) user.name = data.name;
        if (data.settings) {
            user.settings = {
                ...user.settings,
                ...data.settings
            };
        }

        await user.save();
        revalidatePath("/dashboard/settings");

        return NextResponse.json({
            success: true,
            user: JSON.parse(JSON.stringify(user))
        });
    } catch (error) {
        console.error("[API User Settings PATCH] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
