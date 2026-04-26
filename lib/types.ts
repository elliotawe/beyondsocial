export interface IUser {
    _id: string;
    name?: string;
    email: string;
    planTier: "free" | "pro" | "business";
    credits: number;
    monthlyCreditsUsed: number;
    lastCreditReset?: string | null;
    role: "user" | "admin";
    createdAt: string;
    image?: string;
    password?: string;
    settings?: {
        autoHashtags: boolean;
        smartCaptionLength: boolean;
        experimentalVideoStyles: boolean;
        notifications: {
            email: boolean;
            push: boolean;
        }
    }
}

export interface ICreditTransaction {
    _id: string;
    userId: string;
    amount: number;
    reason: string;
    action: string;
    balanceBefore: number;
    balanceAfter: number;
    projectId?: string;
    createdAt: string;
}

export interface IScene {
    scene_id: number;
    role: string;
    duration_seconds: number;
    script: string;
    visual_direction: string;
}

export interface IRefinedScript {
    video_style: string;
    tone: string;
    scenes: IScene[];
    cta: string;
}

export interface IProject {
    _id: string;
    userId: string;
    title: string;
    status: "draft" | "processing" | "completed" | "failed";
    roughIdea?: string;
    script?: IRefinedScript;
    uploadedImages: string[];
    generatedVideoUrl?: string;
    videoUrl?: string; // Client-side often uses videoUrl
    thumbnail?: string;
    taskId?: string;
    scheduledAt?: string | Date;
    socialPlatforms: string[];
    socialStatus: "idle" | "scheduled" | "posted" | "failed";
    createdAt: string;
    aspectRatio?: string;
}

export interface IJob {
    _id: string;
    userId: string;
    type: "video_generation" | "social_post";
    status: "pending" | "processing" | "completed" | "failed";
    createdAt: string;
    payload?: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: string;
}

export interface IAdminStats {
    totalUsers: number;
    totalProjects: number;
    totalJobs: number;
    activeUsers: number;
    recentJobs: IJob[];
}
