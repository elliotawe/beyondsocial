# Documentation Cross-Reference Audit: fal.ai, Inngest, Shotstack & Cloudinary

## TL;DR
- The single most dangerous bug is the **fal.ai webhook handler returning HTTP 200 (`{received:true}`) when no job is found for a `request_id`** — fal treats any 200 as "delivered" and stops retrying, so a webhook that arrives before the `request_id` is persisted is lost permanently. Return a non-2xx instead so fal's documented "retry 10 times in the span of 2 hours" window can recover it.
- The **Shotstack wait matching on `data.projectId` is confirmed buggy** — a stale `done` event from a prior render of the same project will satisfy the match. Shotstack's webhook payload includes the render `id`, so you should match on a unique `renderId` instead.
- Status-string handling for fal.ai conflates **webhook statuses (`OK`/`ERROR`) with queue statuses (`IN_QUEUE`/`IN_PROGRESS`/`COMPLETED`)**; `FAILED` is not a valid fal status anywhere, and the video URL lives under `payload.video.url` in webhooks but `data.video.url` in SDK `result()` calls — an asymmetry that will silently break a shared extractor.

## Key Findings

1. **fal.ai webhook success/failure statuses**: The only valid webhook `status` values are `"OK"` (success) and `"ERROR"` (failure). `"COMPLETED"` and `"FAILED"` are NOT webhook values — `COMPLETED` is a *queue* status returned by `fal.queue.status()`, and `FAILED` is not a documented fal status at all. fal's Queue docs state explicitly: "The webhook status is 'OK' for successful responses (HTTP 200) or 'ERROR' for failures — this is different from the queue status values (IN_QUEUE, IN_PROGRESS, COMPLETED)."
2. **fal.ai payload field**: The webhook body's output is under `payload` (e.g. `payload.video.url`), never `data`. The SDK's `fal.queue.result()` returns the output under `.data` instead. These are different shapes for the same logical data.
3. **fal.ai retry/idempotency**: 15-second initial delivery timeout; on failure/timeout fal retries 10 times over 2 hours; handlers must be idempotent on `request_id`. A 200 acknowledges delivery and (by strong implication) halts retries.
4. **Inngest `if` CEL syntax is correct**; `async` = the awaited (incoming) event, `event` = the original trigger. `match` (dot-notation) and `if` (CEL) are mutually exclusive.
5. **Inngest waitForEvent only catches events sent AFTER the wait step begins executing** — a fast webhook can be missed, causing a timeout.
6. **Shotstack payload** is `{type, action, id, owner, status, url, error, completed}` with statuses `done`/`failed` (and `queued`/`fetching`/`rendering`/`saving`); the code's `{id, status, url, error}` parse and `done`/`failed` checks are correct.
7. **Cloudinary `uploader.upload(remoteUrl, ...)` is the correct method** for remote URLs and `resource_type: "video"` is required for mp4 with the default upload method, but `upload()` caps at 100MB — large composed videos need `upload_large` (chunked).

## Details

### FAL.AI (@fal-ai/client ^1.10.1)

**What the docs say is correct:**
- `fal.queue.submit(endpointId, { input, webhookUrl })` returns `{ request_id, gateway_request_id }` synchronously and immediately. Passing `webhookUrl` in `SubmitOptions` is the documented pattern.
- The webhook POST body shape (verbatim from fal's webhooks docs) is:
  ```json
  { "request_id": "...", "gateway_request_id": "...", "status": "OK", "payload": { ... } }
  ```
  On error: `status: "ERROR"`, with an `error` message string and error details under `payload`. If the payload isn't JSON-serializable, `payload` is `null` and a `payload_error` string is included.
- For video models, the output mirrors the model's output schema, so the URL is at `payload.video.url`.
- `fal.queue.status()` returns a `QueueStatus` whose `status` is one of `IN_QUEUE | IN_PROGRESS | COMPLETED`. `fal.queue.result()` returns a `Result` with `.data` (the output) and `.requestId`.
- Retry policy (verbatim): "Initial webhook deliveries have a 15-second timeout. If a delivery exceeds this time or fails to deliver the payload, it will retry 10 times in the span of 2 hours. Design your webhook handler to be idempotent and tolerate repeat deliveries for the same request_id."
- The Queue docs add (verbatim): "Return 200 quickly to acknowledge the webhook. fal may retry failed deliveries, so use request_id for idempotency."

**How the current code compares & bugs:**
- **BUG (critical) — silent 200 on missing job kills fal's retry safety net.** The handler returns `{received:true}` (HTTP 200) when no job is found for `request_id`. fal interprets 200 as successful delivery and will not retry. If the webhook arrives before the `request_id` is committed to MongoDB, the completion is lost forever and the Inngest wait will time out. The docs do NOT guarantee that `submit()` returns to your caller before the completion webhook fires — for fast models this race is real and explicitly *undocumented*. **Fix:** when no job is found, return a non-2xx (e.g., 503) so fal redelivers within its 10-retry/2-hour window; combine with idempotency keyed on `request_id`.
- **Dead/confusing status branches.** Checking `status === "ERROR" || "FAILED"` includes `FAILED`, which fal never sends in a webhook (and is not even a valid queue status). Checking `status === "OK" || "COMPLETED"` includes `COMPLETED`, which only appears via `fal.queue.status()` polling, not webhooks. These branches are dead for the webhook path. **Verify the literal operator:** if the JS is `status === "OK" || "COMPLETED"` rather than `status === "OK" || status === "COMPLETED"`, that expression is ALWAYS truthy (the string `"COMPLETED"` is truthy), meaning every webhook — including errors — would be treated as success.
- **Payload-field asymmetry risk.** Extracting `resultData?.video?.url ?? resultData?.video_url` is correct ONLY if `resultData` is `body.payload` on the webhook path. The fallback polling path uses `fal.queue.result()`, whose output is under `result.data` — so the same extractor must be fed `result.data` there, not `result.payload`. `video_url` (snake) is not the documented field; the documented shape is `payload.video.url`. Confirm both paths feed the correct object into the extractor.
- **fal.subscribe() dev path**: dormant because `NEXTAUTH_URL` is ngrok — acceptable, but note `subscribe()` returns `result.data...` (the SDK shape), not the webhook `payload` shape.

**Missing patterns the docs recommend:**
- **Webhook signature verification.** Per fal's Webhooks docs, verify the `X-Fal-Webhook-Signature` header (using `X-Fal-Webhook-Request-Id` and `X-Fal-Webhook-User-Id`) against ED25519 keys at `https://rest.fal.ai/.well-known/jwks.json`, enforcing a ±300-second timestamp window (reference code: `if (Math.abs(currentTime - timestampInt) > 300) { return false; }`). The current `?secret=` query param is a homegrown scheme, not fal's documented verification.
- IP allowlisting via the `https://api.fal.ai/v1/meta` (webhook IP ranges) endpoint, if your infra requires it.
- Idempotency keyed on `request_id` to tolerate the documented repeat deliveries.

### INNGEST (SDK ^4.3.0)

**What the docs say is correct:**
- `if` accepts a CEL expression where `async` is the incoming/awaited event and `event` is the original trigger. `async.data.projectId == "..."` is the correct way to reference the awaited event's data — confirmed by the v4 reference and examples.
- `match: "data.projectId"` (dot-notation string) is a valid shorthand that requires the named field to be equal in BOTH the trigger event and the awaited event. `match` and `if` cannot be combined.
- Running multiple `step.waitForEvent()` in `Promise.all()` is a supported, documented pattern.
- `serve({ client: inngest, functions: [generatePremiumVideo] })` in the App Router is correct for v4.

**How the current code compares & bugs:**
- **Design risk — `waitForEvent` only catches events sent AFTER the wait step executes.** Inngest docs state plainly: "The 'wait for event' method begins listening for new events from when the code is executed... events sent before the function is executed will not be handled by the wait," and the Inngest skills guide: "waitForEvent ONLY catches events sent AFTER this step executes." With a very fast fal/Shotstack job, the webhook → Inngest event can fire before the run reaches `waitForEvent`, and the wait will time out despite the work being done. The fal/Shotstack `submit`/`compose` step should be INSIDE a `step.run()` that precedes the `waitForEvent` in the same function so ordering is guaranteed; do not send the resume event from outside before the wait is registered.
- **`retries: 0` interaction.** A timed-out `waitForEvent` does NOT throw — it resolves to `null` — so it does not by itself trigger a retry or replay. However, with `retries: 0`, any *other* step that throws after the wait fails the whole function permanently with no recovery (there is a documented historical issue, inngest/inngest #1290, about a function getting "stuck" when `step.run` fails after `waitForEvent` with `retries: 0`). Because each step replays the function body from the top, all non-deterministic code must be inside steps; `retries: 0` removes your safety net for transient webhook-handler/database hiccups.
- **CEL string interpolation.** Building `if: \`async.data.projectId == "${projectId}" && async.data.requestId == "${requestId}"\`` works, but if `projectId`/`requestId` could ever contain a double-quote it breaks the expression; prefer `match` or guarantee the IDs are quote-free UUIDs. The dual-field (`projectId && requestId`) match is GOOD — it's more specific than the Shotstack `match: "data.projectId"` alone.

**Missing patterns the docs recommend (v4-specific):**
- **Checkpointing `maxRuntime` for serverless.** v4 enables checkpointing by default; on Vercel you must set `checkpointing: { maxRuntime: '...' }` (≈60–80% of the function's max duration) AND export `maxDuration` on the `/api/inngest` route. Without this, long `waitForEvent`-bearing functions can be cut off.
- **Cloud-mode signing key.** v4 defaults to `cloud` mode, which requires `INNGEST_SIGNING_KEY` (prod) or `isDev: true` / `INNGEST_DEV=1` (local). Verify this is set or the serve handler will error with "A signing key is required to run in Cloud mode."
- **Optimized parallelism caveat.** v4 enables `optimizeParallelism` by default; `Promise.all` of `waitForEvent`s is fine (you want all to settle), but if any code relies on `Promise.race` early-resolution it now waits for ALL to settle — use `group.parallel()` if that behavior is needed.
- **eventType()/triggers in options.** If migrating from v3 patterns, triggers now live in the options object and `EventSchemas` is replaced by `eventType()`/`staticSchema()`.

### SHOTSTACK (stage environment)

**What the docs say is correct:**
- `POST https://api.shotstack.io/stage/render` with a root-level `callback` URL is correct. The render response is `{ success, message, response: { message, id } }` (201) — store `response.id`.
- The webhook (edit/render) payload is exactly: `{ "type": "edit", "action": "render", "id": "...", "owner": "...", "status": "done", "url": "...", "error": null, "completed": "..." }`.
- Webhook statuses are `done` (success) and `failed` (failure); polling statuses also include `queued`, `fetching`, `rendering`, `saving`. The code's `done`/`failed` checks are correct.
- GetRenderStatus (`GET /stage/render/{id}`) returns `{ success, message, response: { id, owner, plan, status, url, data: { output, timeline }, created, updated } }` — the URL is at `response.url`.

**How the current code compares & bugs:**
- **BUG (confirmed) — matching on `projectId` is too coarse.** The webhook payload's `id` IS the render ID. The Inngest Shotstack wait using `match: "data.projectId"` will be satisfied by a stale `done` event from any earlier render of the same project. **Fix:** include the render `id` in the Inngest event (e.g., `data.renderId = body.id`) and match on `data.renderId`, which is globally unique per render.
- **Multi-payload hazard.** If any Serve destinations are connected, Shotstack sends ADDITIONAL callbacks with a different shape (`{ "type": "serve", "action": "copy", ... }`). A handler that blindly parses `{id, status, url, error}` may misinterpret a `serve`/`copy` payload as a render result. **Fix:** guard on `type === "edit" && action === "render"`.
- **No native webhook signing.** Shotstack states it does "not provide signed payloads"; the recommended verification is to call the render-status API with your API key and the render ID and confirm the data matches. The `?secret=` query param is your own scheme, not Shotstack-validated — consider the API cross-check for the final composed video.

**Webhook retry behavior:** "If the callback POST receives an error code outside the range of 200-399 or a response is not returned by your application within 10 seconds we will cancel the request and retry. An exponential back-off is used... By default we will try to re-queue the message 10 times with a back-off exponent of 3." So, like fal, returning a non-2xx (or being slow >10s) triggers redelivery — your handler can lean on this for the same "renderId not yet stored" race.

**Stage vs v1:** `stage` is the sandbox environment; rendered files land in the `shotstack-api-stage-output` S3 bucket and on the CDN (e.g., the Hello World docs show `https://cdn.shotstack.io/au/stage/5ca6hu7s9k/d2b46ed6-998a-4d6b-9d91-b8cf0193a655.mp4`). Output files are temporary: per Shotstack's docs, "All files generated by the API expire after 24 hours... After 24 hours the file at the URL provided by the API will be deleted" — so you must persist to Cloudinary promptly. The docs do not document a different webhook-delivery mechanism for stage vs v1, but stage is subject to sandbox quotas/watermarking; confirm production uses `v1`.

### CLOUDINARY (uploader.upload with remote URL, resource_type: "video")

**What the docs say is correct:**
- `cloudinary.uploader.upload(remoteUrl, {...})` is the **correct and recommended** way to ingest a remote URL: "If your assets are already publicly available online, you can specify their remote HTTP or HTTPS URLs... Cloudinary will retrieve the file from its remote URL and upload it directly to Cloudinary." `upload_stream` is for piping local/in-memory streams and is NOT needed here.
- `resource_type: "video"` is REQUIRED for mp4 with the default `upload()` method (which otherwise defaults to `image`); alternatively `resource_type: "auto"` auto-detects. The code's explicit `"video"` is correct.
- The success response includes `secure_url` (HTTPS), `url` (HTTP), `public_id`, `asset_id`, `version`, `format`, dimensions, etc. `secure_url` is present on every successful upload.

**How the current code compares & bugs/risks:**
- **Size/timeout risk on the final composed video.** Per Cloudinary's Node.js docs, "The upload method supports uploading files up to 100 MB (subject to account limitations). To upload larger files, use one of the other methods, which use streaming or chunking functionality." Cloudinary Support adds: "When uploading files, the maximum size of the request body can be 100MB. Any request that is larger than this would receive a 413 error." fal raw clips are usually fine, but a final Shotstack composed video can exceed 100MB. **Fix:** use `upload_large()`, which "uploads a large file to the cloud in chunks, and is required for any files that are larger than 100 MB" (default `chunk_size` 20MB, settable "as low as 5 MB"); it's safe to use for small files too. "For any file larger than 20 GB you also need to set the async parameter to true... contact support to increase your upload limit up to 100 GB."
- **Serverless synchronous-upload risk.** `upload()` is synchronous and the Node SDK's default request timeout is ~60s; because Cloudinary fetches the remote URL server-side, your serverless function blocks until Cloudinary finishes ingesting/processing. Large videos can hit both Cloudinary's processing timeout ("Timeout waiting for parallel processing", HTTP 420) and your platform's function timeout. **Fix:** for any eager transformation use `eager_async: true`; for large media use `upload_large`; raise the SDK `timeout` option; and ensure your serverless `maxDuration` is generous.
- **`secure_url` with chunked uploads.** If you switch to `upload_large`, intermediate chunk responses carry `done: false` and only basic info — only the FINAL response (`done: true`) contains the full object with `secure_url`. Read `secure_url` from the final callback/result, not intermediate ones.

**Limits:** Free plan caps video at 100MB regardless of upload method; paid plans raise this. SDK chunked upload supports up to 100GB (with `async: true` >20GB, and support contact for higher). Standard Cloudinary API rate limits apply per plan.

## Recommendations

**Stage 1 — Fix the data-loss bugs (do first):**
1. **fal webhook handler:** when no job matches `request_id`, return HTTP 503 (not 200) so fal retries; keep idempotency on `request_id`. Only return 200 once the event has been successfully forwarded to Inngest (or already processed).
2. **Shotstack wait:** persist `renderId` and switch the Inngest wait from `match: "data.projectId"` to `match: "data.renderId"` (or an `if` on `async.data.renderId`). Populate `data.renderId = body.id` in the webhook→Inngest event.
3. **Shotstack handler:** guard on `type === "edit" && action === "render"` to ignore Serve/destination callbacks.

**Stage 2 — Harden status/payload handling:**
4. **fal status checks:** treat the webhook path as `OK`/`ERROR` only; treat the polling path (`fal.queue.status()` → `COMPLETED`, then `fal.queue.result()`) separately. Remove `FAILED` (never emitted). Verify the success check is `status === "OK" || status === "COMPLETED"` (proper equality), not the always-truthy `status === "OK" || "COMPLETED"`.
5. **fal URL extraction:** read `body.payload.video.url` on the webhook path and `result.data.video.url` on the polling path; don't share one extractor that assumes a single shape.

**Stage 3 — Inngest correctness/durability:**
6. Ensure the fal `submit` / Shotstack `compose` calls happen inside a `step.run()` that runs BEFORE the corresponding `waitForEvent` in the same function, so the wait is registered before any webhook can arrive (mitigates "events sent before the wait are not caught").
7. Reconsider `retries: 0`: at minimum, allow ≥2 retries on the steps that submit jobs and write to the database, or wrap fragile post-wait steps so a transient failure can't permanently strand the run.
8. Set `checkpointing.maxRuntime` and route `maxDuration` for serverless; confirm cloud-mode signing key is configured.

**Stage 4 — Cloudinary robustness:**
9. Switch video uploads to `upload_large()` and add `eager_async: true` for any transformations; raise the SDK `timeout` and serverless `maxDuration`. Read `secure_url` from the final response.

**Stage 5 — Security hardening:**
10. Replace the `?secret=` schemes with provider-native verification: fal JWKS signature check (`X-Fal-Webhook-Signature` against `https://rest.fal.ai/.well-known/jwks.json`, ±300s); Shotstack render-status API cross-check.

**Benchmarks that change these recommendations:** If your fal models always take >30s and your serverless cold-start + DB write is <1s, the fal early-arrival race is unlikely (but the 503-on-missing-job fix is still cheap insurance). If final composed videos are reliably <100MB, plain `upload()` with a raised timeout may suffice instead of `upload_large`.

## Caveats
- fal's docs do NOT explicitly address whether a completion webhook can arrive before `submit()` returns the `request_id` to your caller; treat it as possible-but-undocumented. The 503-on-missing-job mitigation is defensive regardless. fal's docs also do not state in a single sentence that "200 stops retries" — it is strongly implied ("Return 200 quickly to acknowledge"; retries are for deliveries that "fail to deliver") but not a verbatim guarantee.
- The "always-truthy" concern for the fal status check depends on the literal source operator; verify the actual JS before assuming the bug is present.
- The Inngest "stuck function with retries:0 after waitForEvent" behavior references a historical GitHub issue (inngest/inngest #1290); confirm whether it's resolved in your exact SDK build, but the architectural guidance (keep submit inside a step before the wait; avoid retries:0 on fragile steps) holds regardless.
- Shotstack stage-vs-v1 differences beyond sandboxing/quotas/watermarking are not documented; validate production behavior on `v1`. Note the 24-hour output-file expiry applies to both environments.
- Cloudinary plan-specific size and rate limits vary; confirm against your account tier.