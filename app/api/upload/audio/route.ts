import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { User } from "@/models/User";

fal.config({ credentials: process.env.FAL_API_KEY ?? process.env.FAL_KEY ?? "" });

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("audio/")) {
      return NextResponse.json({ error: "File must be an audio type" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Audio file must be under 20 MB" }, { status: 400 });
    }

    const uploadedUrl = await fal.storage.upload(file);

    await connectDB();
    await User.findOneAndUpdate(
      { email: session.user.email },
      { clonedVoiceUrl: uploadedUrl }
    );

    return NextResponse.json({ url: uploadedUrl });
  } catch (err) {
    console.error("[upload/audio] error:", err);
    return NextResponse.json({ error: "Failed to upload audio" }, { status: 500 });
  }
}
