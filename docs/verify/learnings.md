# Engineering Learnings & Field Notes — The Cornwall Dispatch

Operational quirks, API limits, and CLI recipes discovered while building and evolving **The Cornwall Dispatch** (`main` @ `3b52e0e` + `v2` working tree). Kept separate from [decisions.md](./decisions.md) so design decisions stay scannable in under a minute.

## 1. Parallel Web Systems API (`api.parallel.ai`)

- **Omit overriding `fetch_policy` on immutable monthly PDFs in `POST /v1/extract`**:
  - On `/v1/extract` (the GA endpoint backing `https://platform.parallel.ai/play/extract`), `full_content`, `excerpt_settings`, `fetch_policy`, and `links` must sit inside `advanced_settings` (top-level `v1beta` placement returns `HTTP 422`).
  - Passing `fetch_policy: { max_age_seconds: 86_400, timeout_seconds: 12 }` on an immutable monthly PDF (`November_2026.pdf`) forces Parallel to discard its indexed PDF copy every 24 hours and re-crawl `cornwallchronicle.org` live with a 12-second cutoff — shorter than Parallel's `15s–60s` dynamic PDF timeout — triggering SiteGround `HTTP 202` WAF deferrals. Omitting `fetch_policy` in [src/sources/chronicle.ts](../../src/sources/chronicle.ts) lets Parallel serve its indexed PDF Markdown immediately and use its native dynamic timeout on first crawl.
- **`/v1beta/chat/completions` Bearer auth caching & fresh `AbortController` per retry**:
  - `/v1/extract`, `/v1/search`, and `/v1/decisions` accept `x-api-key`, whereas `/v1beta/chat/completions` requires `Authorization: Bearer <key>` (`HTTP 401` on `x-api-key`).
  - Caching `chatUsesBearer` and creating a fresh `AbortController` on each retry attempt in [src/sources/parallel.ts](../../src/sources/parallel.ts) prevents burning a double handshake against the same timeout timer on every chat call.
- **`/v1/decisions` Yes/No predicate type is `noul`, not `boolean`**:
  - Passing `type: "boolean"` to `POST https://api.parallel.ai/v1/decisions` fails schema validation. Yes/No predicates must declare `type: "noul"` and inspect `decision.answer?.noul === "yes"` ([src/sources/parallel.ts](../../src/sources/parallel.ts)).
- **`/v1beta/chat/completions` structured `json_schema` 20k-char message ceiling**:
  - Strict `response_format: { type: "json_schema", json_schema: { name, schema } }` is supported on `model: "lite"`, `"base"`, and `"core"` (not `"speed"`), with a hard **20,000-character ceiling** per message (`HTTP 400` above 20k). Monthly *Cornwall Chronicle* issues run ~30,000 characters across 7–8 pages, so [src/sources/chronicle.ts](../../src/sources/chronicle.ts) batches content under `16,000` characters across two specialized schemas (`CHRONICLE_EVENTS_SCHEMA` and `CHRONICLE_EDITORIAL_SCHEMA`), and [src/synthesize.ts](../../src/synthesize.ts) caps serialized prompt context at `16,500` characters.
- **Parallel Task API (`/v1/tasks/runs`) latency vs Vercel `maxDuration: 60`**:
  - Parallel's async Task API supports `output_schema` directly on URLs/PDFs, but its `p50: 45s` / `p90: 90s` runtime exceeds synchronous Vercel function budgets (`maxDuration: 60`). Synchronous `/v1/extract` + two-track `/v1beta/chat/completions` completes well inside budget.

## 2. Serverless PDF Extraction (`unpdf` Fallback & Flyer Typography)

- **Pass `{ verbosity: 0 }` and `{ mergePages: false }` to `unpdf`, sequentially per URL**:
  - Default PDF.js font verbosity (`1`) logs noisy `Warning: TT: undefined function: 32` messages on embedded newsletter TrueType hints; `{ verbosity: 0 }` in `getDocumentProxy(bytes, { verbosity: 0 })` silences them cleanly ([src/sources/chronicle.ts](../../src/sources/chronicle.ts)).
  - `{ mergePages: false }` preserves page boundaries so full-page flyers (`< 2800` chars) and calendar grids (`SUNDAY MONDAY TUESDAY`) can be classified separately from prose essays, and running `unpdf` sequentially avoids PDF.js singleton state races inside one Node isolate.
- **De-kern letter-spaced display type on Chronicle flyers**:
  - Back-page Chronicle flyers extract with single-space display kerning (`3 0 P i n e S t r e e t , C o r n w a l l L i b r a r y . o r g`). Running `dekernDisplayType()` ([src/sources/chronicle.ts](../../src/sources/chronicle.ts)) restores readable street addresses and URLs (`30 Pine Street, CornwallLibrary.org`) before LLM extraction.

## 3. 1Password + `fnox` Secret Management

- **Never set `provider = "op"` on optional unprovisioned keys in `fnox.toml`**:
  - Adding `provider = "op"` (even with `if_missing = "ignore"`) on optional env vars like `UPSTASH_REDIS_REST_URL` causes `fnox`'s batch `op inject` call to fail (`WARN fnox_core::providers::onepassword: op inject failed, falling back to individual calls`). Declaring optional env-backed keys in [fnox.toml](../../fnox.toml) *without* `provider = "op"` keeps `mise run dev` warning-free while still documenting them in `mise run secrets:list`.
- **Always pass `--non-interactive` to `fnox` in automated/agent CLI runs**:
  - When macOS 1Password biometric unlock times out, `fnox --profile runtime exec` prompts interactively on stdin (`Run op signin to authenticate?`) and blocks non-TTY background processes indefinitely unless `--non-interactive` is passed.
- **`fnox`'s `1password` provider is read-only (`fnox set` writes to `fnox.toml`!)**:
  - Never run `fnox set KEY` expecting it to write into 1Password — create or rotate secrets directly via `op` with `--account="thefocusai.1password.com"` and reference only item names in [fnox.toml](../../fnox.toml):

    ```sh
    op item create --category=password \
      --title="PARALLEL_API_KEY" \
      --vault="Cornwall Dispatch" \
      --account="thefocusai.1password.com" \
      "password=<value>"
    ```

- **Always pin `account = "thefocusai.1password.com"` in `[providers.op]`**:
  - Prevents `fnox` directory hooks from querying an ambiguous personal 1Password account.

## 4. Runtime & Vercel Edge Execution Notes

- **Top-level `await` in inline `tsx` one-liners**:
  - Running `npx tsx -e "const x = await ..."` defaults to CommonJS transform and rejects top-level `await`. Invoke ESM inline scripts with `node --input-type=module --import tsx -e "..."`.
- **Suppress interactive update prompts in non-TTY Vercel CLI runs**:
  - Prefix `vercel@56.2.1` invocations with `CI=1 NO_UPDATE_NOTIFIER=1`, and pipe secrets via `stdin` inside `fnox exec`:

    ```sh
    fnox --profile runtime exec -- sh -c '
      printf "%s" "$PARALLEL_API_KEY" | CI=1 NO_UPDATE_NOTIFIER=1 mise exec npm:vercel@56.2.1 -- vercel env add PARALLEL_API_KEY production,preview --sensitive --force --yes --scope thefocusai
    '
    ```

- **Warm Edge caches in dependency order (`/api/chronicle` -> `/`)**:
  - Having [api/cron.ts](../../api/cron.ts) fetch `${origin}/api/chronicle` (`s-maxage=86400`) before `${origin}/` (`s-maxage=900`) ensures `/` hits the warmed Edge CDN digest in `< 50ms` and avoids duplicate cold LLM passes.
