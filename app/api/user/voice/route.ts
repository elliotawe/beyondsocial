import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email }).select("clonedVoiceUrl");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ clonedVoiceUrl: user.clonedVoiceUrl ?? null });
  } catch (err) {
    console.error("[user/voice GET] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    await User.findOneAndUpdate(
      { email: session.user.email },
      { $unset: { clonedVoiceUrl: "" } }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[user/voice DELETE] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
