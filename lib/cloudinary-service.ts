import { v2 as cloudinary } from "cloudinary";

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
 * Uploads a video to Cloudinary and returns the permanent secure URL.
 *
 * Always uses upload() with the remote URL — Cloudinary's API fetches the file
 * server-to-server, so no video data passes through Vercel. This avoids the
 * memory pressure and Vercel timeout that upload_large() caused when it downloaded
 * the full file into the serverless function before chunking.
 *
 * The 100 MB cap on upload() applies only to direct (body) uploads, not URL fetches.
 */
export async function uploadVideo(
    videoUrl: string,
    options: {
        folder?: string;
        publicId?: string;
        tags?: string[];
        metadata?: Record<string, string>;
        large?: boolean; // kept for API compatibility; no longer changes behaviour
    } = {}
): Promise<CloudinaryUploadResponse> {
    const { large: _large, ...rest } = options;

    try {
        console.log(`[Cloudinary] Uploading video via remote fetch: ${videoUrl}`);

        const uploadResponse = await cloudinary.uploader.upload(videoUrl, {
            folder: rest.folder || "beyond-social/videos",
            public_id: rest.publicId,
            resource_type: "video",
            tags: rest.tags || [],
            context: rest.metadata || {},
            // Give Cloudinary's servers up to 4 minutes to fetch and process the file.
            // Their fetch is server-to-server so this is conservative.
            timeout: 240_000,
        }) as CloudinaryUploadResponse;

        console.log(`[Cloudinary] Upload complete. URL: ${uploadResponse.secure_url}`);
        return uploadResponse;
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
