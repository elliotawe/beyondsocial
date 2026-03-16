"use server";

import { fetchTrendingVideos, extractConceptFromVideo, type TrendingVideo } from "@/lib/discovery-service";

export async function getTrendingVideos(industry: string): Promise<TrendingVideo[]> {
    return await fetchTrendingVideos(industry);
}

export async function getConceptFromTrendingVideo(video: TrendingVideo) {
    return await extractConceptFromVideo(video);
}
