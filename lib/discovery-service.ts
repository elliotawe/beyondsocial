import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export interface TrendingVideo {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl: string;
    engagement: {
        views: number;
        likes: number;
        comments: number;
    };
    metadata: {
        caption: string;
        hashtags: string[];
        author: string;
    };
}

export async function fetchTrendingVideos(industry: string): Promise<TrendingVideo[]> {
    const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
    const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
        console.warn("TikTok API credentials not set. Falling back to high-quality mock data.");
        return getMockVideos(industry);
    }

    try {
        console.log(`📡 Official TikTok Research API: Searching trends for "${industry}"...`);

        // 1. Get Access Token (Client Credentials Flow)
        const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: TIKTOK_CLIENT_KEY,
                client_secret: TIKTOK_CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });

        if (!tokenRes.ok) throw new Error("Failed to authenticate with TikTok API");
        const { access_token } = await tokenRes.json();

        // 2. Query Public Videos
        // Note: Requires research.data.basic scope approval
        const queryRes = await fetch("https://open.tiktokapis.com/v2/research/video/query/?fields=id,video_description,create_time,view_count,like_count,comment_count,username,display_name,hashtag_names", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: {
                    and: [
                        { operation: "IN", field_name: "hashtag_name", field_values: [industry.toLowerCase().replace(/\s+/g, "")] }
                    ]
                },
                start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, ''), // Last 30 days
                end_date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                max_count: 10
            })
        });

        if (!queryRes.ok) throw new Error("TikTok search query failed");

        const { data } = await queryRes.json();
        const videos = data.videos || [];

        return videos.map((v: any) => ({
            id: v.id,
            title: v.video_description?.substring(0, 60) || `Trending in ${industry}`,
            videoUrl: `https://www.tiktok.com/@${v.username}/video/${v.id}`,
            thumbnailUrl: `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80`, // Placeholder
            engagement: {
                views: v.view_count || 0,
                likes: v.like_count || 0,
                comments: v.comment_count || 0
            },
            metadata: {
                caption: v.video_description || "",
                hashtags: v.hashtag_names || [],
                author: v.display_name || v.username || "TikTok Creator"
            }
        }));
    } catch (error) {
        console.error("TikTok API Error:", error);
        return getMockVideos(industry);
    }
}

async function getMockVideos(industry: string): Promise<TrendingVideo[]> {
    // High-quality fallback mock data
    const mockVideos: Record<string, TrendingVideo[]> = {
        "Real Estate": [
            {
                id: "re1",
                title: "Luxury Penthouse Tour",
                videoUrl: "https://cdn.coverr.co/videos/coverr-modern-apartment-interior-8557/1080p.mp4",
                thumbnailUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80",
                engagement: { views: 250000, likes: 12000, comments: 450 },
                metadata: {
                    caption: "The view from this penthouse is unmatched. Would you live here?",
                    hashtags: ["#luxuryrealestate", "#penthouseliving", "#architecture"],
                    author: "EliteHomes"
                }
            }
        ],
        "Tech": [
            {
                id: "tech1",
                title: "New AI Gadget Unboxing",
                videoUrl: "https://cdn.coverr.co/videos/coverr-typing-on-laptop-2633/1080p.mp4",
                thumbnailUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=400&q=80",
                engagement: { views: 500000, likes: 45000, comments: 1200 },
                metadata: {
                    caption: "Is this the end of smartphones? Testing the new AI Pin.",
                    hashtags: ["#techreview", "#aigadgets", "#unboxing"],
                    author: "TechGeek"
                }
            }
        ]
    };

    return mockVideos[industry] || [
        {
            id: "gen1",
            title: `Trending ${industry} Content`,
            videoUrl: "https://cdn.coverr.co/videos/coverr-walking-through-a-forest-8575/1080p.mp4",
            thumbnailUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80",
            engagement: { views: 100000, likes: 5000, comments: 100 },
            metadata: {
                caption: `Top trending content in ${industry} today!`,
                hashtags: [industry.toLowerCase().replace(/\s+/g, ""), "trending", "content"],
                author: "TrendScanner"
            }
        }
    ];
}

export async function extractConceptFromVideo(video: TrendingVideo): Promise<{
    concept: string;
    hook: string;
    targetAudience: string;
    suggestedScript: string;
}> {
    try {
        const { text } = await generateText({
            model: openai("gpt-4o"),
            prompt: `
                Analyze the following social media video details and extract a creative concept for a new AI-generated video.
                
                Video Title: ${video.title}
                Caption: ${video.metadata.caption}
                Hashtags: ${video.metadata.hashtags.join(", ")}
                
                Return the following in JSON format:
                {
                    "concept": "A short, viral-ready concept based on the video's core appeal",
                    "hook": "An attention-grabbing first line or visual hook",
                    "targetAudience": "The specific demographic this appeals to",
                    "suggestedScript": "A 15-30 second script structure (Introduction, Core Value, Call to Action)"
                }
            `,
        });

        // Parse clean JSON from AI response
        const cleanedText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("AI extraction failed, using fallback:", error);
        return {
            concept: video.title,
            hook: video.metadata.caption.split('.')[0] || "Check this out!",
            targetAudience: `People interested in ${video.metadata.hashtags[0] || "this topic"}`,
            suggestedScript: "Structure: Introduction, Main Content, Call to Action."
        };
    }
}
