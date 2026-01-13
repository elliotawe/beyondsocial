import { VideoCreator } from "@/components/dashboard/video-creator";

export default function CreateVideoPage() {
    return (
        <div className="h-full">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">Create New Video</h1>
                <p className="text-muted-foreground text-lg">Turn your ideas into professional social media content instantly.</p>
            </div>
            <VideoCreator />
        </div>
    );
}
