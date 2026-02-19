/**
 * Mock Analytics Service
 * Simulates fetching real-time stats from social platforms.
 */

export interface ProjectStats {
    views: number;
    engagement: number;
    shares: number;
    performanceScore: number;
}

export async function fetchProjectAnalytics(projectId: string): Promise<ProjectStats> {
    console.log(`[AnalyticsService] Fetching stats for project: ${projectId}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate some random (but realistic) numbers
    const views = Math.floor(Math.random() * 5000) + 100;
    const engagement = Math.floor(views * (Math.random() * 0.15 + 0.02)); // 2-17% engagement rate
    const shares = Math.floor(engagement * (Math.random() * 0.1));

    // Calculate a performance score (0-100)
    // E.g., based on engagement rate vs a benchmark of 5%
    const engagementRate = views > 0 ? engagement / views : 0;
    const performanceScore = Math.min(100, Math.floor((engagementRate / 0.05) * 50));

    return {
        views,
        engagement,
        shares,
        performanceScore,
    };
}
