import connectDB from "./db";
import { User } from "@/models/User";
import { CreditTransaction } from "@/models/CreditTransaction";
import { CREDIT_COSTS, PLAN_MONTHLY_CREDITS } from "./credit-constants";

export { CREDIT_COSTS, PLAN_MONTHLY_CREDITS } from "./credit-constants";
export type CreditAction = keyof typeof CREDIT_COSTS;

async function maybeResetMonthlyCredits(user: {
    _id: unknown;
    credits: number;
    monthlyCreditsUsed: number;
    lastCreditReset: Date | null;
    planTier: string;
}): Promise<void> {
    const now = new Date();
    const last = user.lastCreditReset ? new Date(user.lastCreditReset) : null;
    const isNewMonth =
        !last ||
        now.getFullYear() > last.getFullYear() ||
        now.getMonth() > last.getMonth();

    if (!isNewMonth) return;

    const limit = PLAN_MONTHLY_CREDITS[user.planTier] ?? PLAN_MONTHLY_CREDITS.free;
    const balanceBefore = user.credits;

    user.credits = limit;
    user.monthlyCreditsUsed = 0;
    user.lastCreditReset = now;

    await CreditTransaction.create({
        userId: user._id,
        amount: limit - balanceBefore,
        reason: `Monthly credits reset — ${limit} credits allocated for ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`,
        action: "monthly_reset",
        balanceBefore,
        balanceAfter: limit,
    });
}

export async function deductCredits(
    userId: string,
    action: CreditAction,
    projectId?: string
): Promise<{ success: boolean; error?: string; remaining?: number; cost?: number }> {
    await connectDB();

    const { amount, reason } = CREDIT_COSTS[action];
    const user = await User.findById(userId);
    if (!user) return { success: false, error: "User not found" };

    await maybeResetMonthlyCredits(user);

    if (user.credits < amount) {
        return {
            success: false,
            error: `Insufficient credits. This action costs ${amount} credit${amount !== 1 ? "s" : ""} but you only have ${user.credits} remaining. Please upgrade your plan.`,
        };
    }

    const balanceBefore = user.credits;
    user.credits -= amount;
    user.monthlyCreditsUsed = (user.monthlyCreditsUsed || 0) + amount;
    await user.save();

    await CreditTransaction.create({
        userId,
        amount: -amount,
        reason,
        action,
        balanceBefore,
        balanceAfter: user.credits,
        projectId: projectId || undefined,
    });

    return { success: true, remaining: user.credits, cost: amount };
}

export async function refundCredits(
    userId: string,
    action: CreditAction,
    projectId?: string
): Promise<void> {
    await connectDB();
    const { amount, reason } = CREDIT_COSTS[action];
    const user = await User.findById(userId);
    if (!user) return;

    const balanceBefore = user.credits;
    user.credits += amount;
    user.monthlyCreditsUsed = Math.max(0, (user.monthlyCreditsUsed || 0) - amount);
    await user.save();

    await CreditTransaction.create({
        userId,
        amount: +amount,
        reason: `Refund: ${reason}`,
        action: `${action}_refund`,
        balanceBefore,
        balanceAfter: user.credits,
        projectId: projectId || undefined,
    });
}
