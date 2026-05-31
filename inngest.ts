import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "beyond-social",
  // In production these are read automatically from INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY.
  // Explicit passthrough makes it obvious and avoids silent misconfiguration.
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
