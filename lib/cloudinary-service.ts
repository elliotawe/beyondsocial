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
 * Uploads a video from a remote URL to Cloudinary and returns the permanent secure URL.
 *
 * Pass `large: true` for the final composed video (can exceed 100 MB on some plans).
 * upload_large() sends the file in 20 MB chunks and is safe for smaller files too.
 * Plain upload() is kept for individual clips (typically <50 MB) with a raised timeout
 * to handle slow remote fetches from fal.ai's CDN.
 */
export async function uploadVideo(
    videoUrl: string,
    options: {
        folder?: string;
        publicId?: string;
        tags?: string[];
        metadata?: Record<string, string>;
        large?: boolean;   // FIX 6: use upload_large() for final composed video
    } = {}
): Promise<CloudinaryUploadResponse> {
    const { large = false, ...rest } = options;

    try {
        console.log(`[Cloudinary] Starting ${large ? "chunked" : "standard"} video upload from: ${videoUrl}`);

        let uploadResponse: CloudinaryUploadResponse;

        if (large) {
            // FIX 6: upload_large() for the final Shotstack-composed video.
            // Composed 1080×1920 MP4s at 30-60s can approach or exceed 100 MB —
            // upload_large() chunks the transfer and avoids the 100 MB hard cap.
            // Read secure_url from the final response only (intermediate chunks have done:false).
            uploadResponse = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
                cloudinary.uploader.upload_large(
                    videoUrl,
                    {
                        folder: rest.folder || "beyond-social/videos",
                        public_id: rest.publicId,
                        resource_type: "video",
                        tags: rest.tags || [],
                        context: rest.metadata || {},
                        chunk_size: 20_000_000,  // 20 MB chunks (Cloudinary minimum is 5 MB)
                        timeout: 120_000,        // 2 min — large uploads take longer to ingest
                    },
                    (error, result) => {
                        if (error || !result) return reject(error ?? new Error("No result from upload_large"));
                        resolve(result as CloudinaryUploadResponse);
                    }
                );
            });
        } else {
            // Standard upload for individual clips (avatar, b-roll) — usually <50 MB.
            // Raised timeout to 90s to handle slow fetches from fal.ai's CDN.
            uploadResponse = await cloudinary.uploader.upload(videoUrl, {
                folder: rest.folder || "beyond-social/videos",
                public_id: rest.publicId,
                resource_type: "video",
                tags: rest.tags || [],
                context: rest.metadata || {},
                timeout: 90_000,
            }) as CloudinaryUploadResponse;
        }

        console.log(`[Cloudinary] Successfully uploaded video. Secure URL: ${uploadResponse.secure_url}`);
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
