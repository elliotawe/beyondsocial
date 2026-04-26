import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { CreditTransaction } from "@/models/CreditTransaction";
import { PLAN_MONTHLY_CREDITS } from "@/lib/credits";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email }).lean() as {
            _id: unknown;
            credits: number;
            monthlyCreditsUsed: number;
            lastCreditReset?: Date | null;
            planTier: string;
        } | null;

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const transactions = await CreditTransaction.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const monthlyLimit = PLAN_MONTHLY_CREDITS[user.planTier] ?? PLAN_MONTHLY_CREDITS.free;

        return NextResponse.json({
            success: true,
            credits: user.credits,
            monthlyCreditsUsed: user.monthlyCreditsUsed ?? 0,
            monthlyLimit,
            lastCreditReset: user.lastCreditReset ?? null,
            transactions: JSON.parse(JSON.stringify(transactions)),
        });
    } catch (error) {
        console.error("[API Credits History] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
