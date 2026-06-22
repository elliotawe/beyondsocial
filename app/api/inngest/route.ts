import { serve } from "inngest/next";
import { inngest } from "@/inngest";
import { generatePremiumVideo } from "@/lib/inngest/generate-premium-video";

// Allow individual Inngest step executions up to 5 minutes (Vercel Pro max).
// Without this, the default 10s timeout kills long-running steps like fal.subscribe() in dev.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generatePremiumVideo],
});
