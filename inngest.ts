import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "beyond-social",
  // INNGEST_SIGNING_KEY is the only key needed in production.
  // Event keys no longer exist — the signing key covers both serve auth and event sending.
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
