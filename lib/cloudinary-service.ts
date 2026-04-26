import { v2 as cloudinary } from "cloudinary";

/**
 * Configure Cloudinary with environment variables.
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export interface CloudinaryUploadResponse {
    secure_url: string;
    public_id: string;
    duration?: number;
    resource_type: string;
    format: string;
    created_at: string;
    bytes: number;
}

/**
 * Uploads a video from a remote URL to Cloudinary and returns the permanent secure URL.
 * Also attaches metadata as tags.
 */
export async function uploadVideo(
    videoUrl: string, 
    options: { 
        folder?: string; 
        publicId?: string;
        tags?: string[];
        metadata?: Record<string, string>;
    } = {}
): Promise<CloudinaryUploadResponse> {
    try {
        console.log(`[Cloudinary] Starting video upload from: ${videoUrl}`);
        
        const uploadResponse = await cloudinary.uploader.upload(videoUrl, {
            folder: options.folder || "beyond-social/videos",
            public_id: options.publicId,
            resource_type: "video",
            tags: options.tags || [],
            context: options.metadata || {}, // Context is for custom metadata
        });

        console.log(`[Cloudinary] Successfully uploaded video. Secure URL: ${uploadResponse.secure_url}`);
        
        return uploadResponse as CloudinaryUploadResponse;
    } catch (error) {
        console.error("[Cloudinary] Video upload failed:", error);
        throw new Error("Failed to store video in cloud storage.");
    }
}

/**
 * Generates a thumbnail for a Cloudinary video.
 */
export function getThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
        resource_type: "video",
        format: "jpg",
        transformation: [
            { width: 640, crop: "scale" },
            { quality: "auto" },
            { fetch_format: "auto" }
        ]
    });
}

export default cloudinary;
