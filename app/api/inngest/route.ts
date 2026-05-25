import { serve } from "inngest/next";
import { inngest } from "@/inngest";
import { generatePremiumVideo } from "@/lib/inngest/generate-premium-video";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generatePremiumVideo],
});
