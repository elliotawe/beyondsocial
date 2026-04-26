import { NextRequest, NextResponse } from "next/server";

export interface TikTokVideo {
    id: string;
    desc: string;
    cover: string;
    videoUrl: string;
    duration: number;
    stats: { plays: number; likes: number; comments: number; shares: number };
    author: { handle: string; name: string; avatar: string };
    music: { title: string; author: string; original: boolean };
    hashtags: string[];
    region: string;
    createTime: number;
    permalink: string;
}

function parseHashtags(text: string): string[] {
    return (text.match(/#\w+/g) || []).map(h => h.toLowerCase());
}

function formatNumber(n: number): string {
    if (!n) return "0";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTikwm(v: any): TikTokVideo {
    return {
        id: String(v.video_id || v.id || ""),
        desc: v.title || v.desc || "",
        cover: v.cover || v.origin_cover || "",
        videoUrl: v.play || v.wmplay || "",
        duration: Number(v.duration) || 0,
        stats: {
            plays: Number(v.play_count) || 0,
            likes: Number(v.digg_count) || 0,
            comments: Number(v.comment_count) || 0,
            shares: Number(v.share_count) || 0,
        },
        author: {
            handle: v.author?.unique_id || v.author?.uniqueId || "",
            name: v.author?.nickname || "",
            avatar: v.author?.avatarLarger || v.author?.avatar || "",
        },
        music: {
            title: v.music_info?.title || v.music?.title || "",
            author: v.music_info?.author || v.music?.author || "",
            original: Boolean(v.music_info?.original),
        },
        hashtags: parseHashtags(v.title || v.desc || ""),
        region: v.region || "",
        createTime: Number(v.create_time || v.createTime) || 0,
        permalink: `https://www.tiktok.com/@${v.author?.unique_id || v.author?.uniqueId}/video/${v.video_id || v.id}`,
    };
}

async function fetchFromTikwm(query: string): Promise<TikTokVideo[]> {
    const url = `https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=10&cursor=0`;
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1" },
        next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`tikwm HTTP ${res.status}`);
    const json = await res.json();
    const videos: unknown[] = json?.data?.videos ?? json?.data?.items ?? [];
    if (!Array.isArray(videos) || videos.length === 0) throw new Error("tikwm returned 0 results");
    return videos.map(normalizeTikwm);
}

async function fetchFromFallback(query: string): Promise<TikTokVideo[]> {
    // Dynamic import to avoid SSR bundling issues; Search is a top-level named export
    const { Search } = await import("@tobyg74/tiktok-api-dl");
    const cookie = process.env.TIKTOK_COOKIE || "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await Search(query, { type: "video", page: 1, cookie } as never);
    const items: unknown[] = result?.result ?? result?.data ?? [];
    if (!Array.isArray(items) || items.length === 0) throw new Error("Fallback returned 0 results");
    return items.slice(0, 10).map((v: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = v as any;
        return {
            id: String(item.id || item.video_id || ""),
            desc: item.desc || item.title || "",
            cover: item.cover || item.thumbnail || "",
            videoUrl: item.play || item.videoUrl || "",
            duration: Number(item.duration) || 0,
            stats: {
                plays: Number(item.playCount || item.play_count) || 0,
                likes: Number(item.likeCount || item.digg_count) || 0,
                comments: Number(item.commentCount || item.comment_count) || 0,
                shares: Number(item.shareCount || item.share_count) || 0,
            },
            author: {
                handle: item.author?.uniqueId || item.author?.unique_id || "",
                name: item.author?.nickname || "",
                avatar: item.author?.avatarLarger || item.author?.avatar || "",
            },
            music: {
                title: item.music?.title || "",
                author: item.music?.author || "",
                original: Boolean(item.music?.original),
            },
            hashtags: parseHashtags(item.desc || item.title || ""),
            region: item.region || "",
            createTime: Number(item.createTime || item.create_time) || 0,
            permalink: `https://www.tiktok.com/@${item.author?.uniqueId || item.author?.unique_id}/video/${item.id || item.video_id}`,
        };
    });
}

export { formatNumber };

export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams.get("q");
    if (!query?.trim()) {
        return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    try {
        const videos = await fetchFromTikwm(query);
        return NextResponse.json({ items: videos, source: "tikwm" });
    } catch (primaryErr) {
        console.warn("[tiktok-search] tikwm failed:", primaryErr);
        try {
            const videos = await fetchFromFallback(query);
            return NextResponse.json({ items: videos, source: "fallback" });
        } catch (fallbackErr) {
            console.warn("[tiktok-search] fallback failed:", fallbackErr);
            return NextResponse.json({
                items: [],
                fallback: true,
                message: "Could not reach TikTok data sources. Try again shortly.",
            });
        }
    }
}
