"use server";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function uploadImage(file: string): Promise<string> {
    try {
        const uploadResponse = await cloudinary.uploader.upload(file, {
            folder: "beyond-social",
        });
        return uploadResponse.secure_url;
    } catch (error: unknown) {
        console.error("Cloudinary upload error:", error);
        // @ts-expect-error - cloudinary error object shape
        if (error?.http_code === 502 || error?.message?.includes("502")) {
            throw new Error("Server timeout: The image size or complexity exceeds the current processing limits. Please try a smaller file.");
        }
        throw new Error("Failed to upload image to Cloudinary. Please ensure the file is a valid image.");
    }
}
