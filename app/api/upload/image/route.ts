import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { Project } from "@/models/Project";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { file, projectId, role } = body as { file?: string; projectId?: string; role?: "portrait" | "broll" };

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    try {
      const uploadResponse = await cloudinary.uploader.upload(file, {
        folder: "beyond-social",
      });

      const url = uploadResponse.secure_url;

      // Append URL to the correct project field based on role
      if (projectId) {
        try {
          await connectDB();
          if (role === "portrait") {
            // Portrait replaces the single headshot slot
            await Project.findByIdAndUpdate(projectId, { portraitImageUrl: url });
          } else {
            // Default: b-roll image
            await Project.findByIdAndUpdate(projectId, {
              $addToSet: { uploadedImages: url },
            });
          }
        } catch (dbErr) {
          // Non-fatal — upload still succeeded
          console.error("[Upload] Failed to append URL to project:", dbErr);
        }
      }

      return NextResponse.json({ success: true, url });
    } catch (error: unknown) {
      console.error("Cloudinary upload error:", error);
      const err = error as { http_code?: number; message?: string };
      if (err.http_code === 502 || err.message?.includes("502")) {
        return NextResponse.json(
          { error: "Server timeout: The image size or complexity exceeds limits." },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: "Failed to upload image. Please ensure the file is valid." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API Upload Image] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
