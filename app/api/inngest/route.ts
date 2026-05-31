import { serve } from "inngest/next";
import { inngest } from "@/inngest";
import { generatePremiumVideo } from "@/lib/inngest/generate-premium-video";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generatePremiumVideo],
});

// Allow Vercel to keep this route alive long enough for the Inngest sync handshake.
export const maxDuration = 60;
