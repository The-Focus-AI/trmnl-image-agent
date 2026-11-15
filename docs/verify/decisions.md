# Distilled Decisions — The Cornwall Dispatch

Updated: `2026-11-15T20:52:00Z` · Source transcript: `a2489e95-1df2-4292-a0b5-a3e5b5470dc6` (evolving `f69d1871-e7ff-451e-8833-418278e0f6b8`) · Machine-readable: [decisions.json](./decisions.json)

## D-1 · Replace hourly GitHub Pages PNG commits with a stateless Vercel HTML endpoint

- **Type / Outcome**: `choice` -> `decided` · **Credit**: `person` · **Anchor**: [0001-stateless-vercel-page-with-parallel-decisions.md](../adr/0001-stateless-vercel-page-with-parallel-decisions.md)
- **Summary**: Retired the hourly `hermes` -> Grok PNG -> `git push` -> GitHub Pages pipeline in favor of a stateless Vercel web handler (`api/index.ts`) screenshotted directly by TRMNL's Screenshot plugin with Vercel Edge `stale-while-revalidate` caching and zero database.
- **Resolution**: Committing three PNGs per hour bloated `.git` past 2.4 GB and produced repetitive visuals, whereas Vercel aligns with team deployment workflow and serves cached HTML well inside TRMNL's 5-second screenshot timeout.
- **Thread**:
  - **person**: Running an hourly job on `hermes` that commits generated images to Git and serves them via GitHub Pages is blowing up the repo and visually boring; I normally push to Vercel and want a simple black-and-white HTML page TRMNL can screenshot directly with LLM logic inside the function.
  - **coding_agent (`antigravity`)**: Pure client-side browser `fetch` hits upstream CORS walls and risks snapping blank boxes under TRMNL's 5-second timeout, so a stateless Vercel serverless handler backed by CDN `s-maxage=900` and `stale-while-revalidate=86400` keeps everything server-rendered without a database.

## D-2 · Rotate five single-focus counter-readable posters every 15 minutes instead of a dense multi-widget page or raw LLM CSS

- **Type / Outcome**: `choice` -> `decided` · **Credit**: `person` · **Anchor**: [0002-composable-print-archetypes-over-generative-media.md](../adr/0002-composable-print-archetypes-over-generative-media.md)
- **Summary**: Built five deterministic `800×480` 1-bit HTML/CSS/SVG poster archetypes (`dispatch`, `broadsheet`, `handbill`, `almanac`, `poster`) with a `14px–76px` type floor, `>=2.5px` SVG strokes, 15-minute rotation, and a strict village-storefront editorial boundary.
- **Resolution**: A counter-mounted 7.5-inch (~130 DPI) 1-bit TRMNL panel turns dense multi-column newspaper layouts into unreadable micro-print, while unconstrained LLM CSS risks clipping or dead space in front of shop customers.
- **Thread**:
  - **person**: We display this at the store counter, so it needs visual variety inside structured templates and a community storefront boundary rather than household reminders or national partisan fights.
  - **person**: The initial multi-column broadsheet has way too much tiny detail for TRMNL e-ink; apply TRMNL display legibility guidance so each screen reads cleanly across a counter.
  - **coding_agent (`antigravity`)**: Redesigned all five archetypes into single-focus posters (~35–50 words per card, `14px` minimum labels, `76px` hero figures, `>=2.5px` strokes) that rotate every 15 minutes so customers get counter-distance legibility without losing breadth.

## D-3 · Enforce hard calendar gates in TypeScript before seasonal spotlight routing

- **Type / Outcome**: `choice` -> `decided` · **Credit**: `person` · **Anchor**: [seasonal.ts](../../src/seasonal.ts)
- **Summary**: Restricted seasonal topics to hard date-bounded windows in TypeScript before invoking the Parallel Decisions API, and confined the winner to a bounded Seasonal Spotlight slot rather than overriding the entire edition.
- **Resolution**: Unbounded float-score competition previously allowed November freeze-thaw swings to trigger maple-sap headlines and crowd out town news.
- **Thread**:
  - **person**: The old seasonal logic kept misfiring—claiming sap was running in November—and crowded out actual local updates, so gate seasonal topics strictly by calendar window.

## D-4 · Standardize 100% on Parallel Web Systems for extraction, decisions, and synthesis (and forbid pre-Gemini-4 models)

- **Type / Outcome**: `choice` -> `decided` · **Credit**: `person` · **Anchor**: [parallel.ts](../../src/sources/parallel.ts)
- **Summary**: Removed `@google/genai` and `GEMINI_API_KEY` completely, routing live web and PDF extraction (`/v1/extract`, `/v1/search`), editorial triage (`/v1/decisions`), and structured JSON copy/Chronicle synthesis (`/v1beta/chat/completions`) exclusively through Parallel Web Systems with secrets managed in the `Cornwall Dispatch` 1Password vault via `fnox`.
- **Resolution**: Consolidating onto Parallel eliminates multi-vendor API key sprawl while meeting all structured JSON, search, extraction, and rubric-decision needs under a single `PARALLEL_API_KEY` (with an explicit repo policy never to use any Gemini model prior to Gemini 4 if Gemini is ever introduced).
- **Thread**:
  - **person**: Never use anything before Gemini 4, and why carry a separate Gemini dependency at all if Parallel can handle all of our extraction, decision, and LLM synthesis needs?
  - **coding_agent (`antigravity`)**: Verified Parallel `/v1beta/chat/completions` supports strict `json_schema` outputs alongside `/v1/decisions`, `/v1/search`, and `/v1/extract`.
  - **person**: Let's go 100% Parallel and store `PARALLEL_API_KEY` and `CRON_SECRET` in the dedicated `Cornwall Dispatch` vault in `thefocusai.1password.com`.

## D-5 · Feature notable upcoming Cornwall Chronicle calendar events on the Almanac poster instead of wildlife trivia

- **Type / Outcome**: `choice` -> `decided` · **Credit**: `person` · **Anchor**: [archetypes.ts](../../src/render/archetypes.ts)
- **Summary**: Replaced the Almanac poster's bottom-right Nature Notes trivia box with an `ON THE CALENDAR` spotlight (with date pill) showcasing marquee upcoming *Cornwall Chronicle* gatherings while filtering out routine municipal board and Zoom meetings.
- **Resolution**: Generic wildlife snippets extracted from essays (such as `"Flying Squirrel"`) were unremarkable on a shop counter compared to upcoming community gatherings.
- **Thread**:
  - **person**: Showing "Flying Squirrel" on the Almanac screen isn't notable to anyone; replace that slot with something genuinely notable from the town calendar.

## D-6 · Prime `/api/chronicle` then `/` over HTTP inside `GET /api/cron` instead of synthesizing in-process

- **Type / Outcome**: `possible_bug` -> `fixed` · **Credit**: `coding_agent` (`antigravity`) · **Anchor**: [cron.ts](../../api/cron.ts)
- **Summary**: Changed remote `GET /api/cron` executions to warm `GET /api/chronicle` first (`24h` Edge CDN cache) and then `GET /` (`15m` Edge CDN cache), reading `X-Dispatch-*` summary headers from the root response rather than calling `buildStorefrontEdition()` directly in `api/cron.ts`.
- **Resolution**: In-process synthesis inside `api/cron.ts` bypassed the `/api/chronicle` Edge cache and triggered a second full synthesis pass when touching `/`, pushing cold invocations past Vercel's 60-second `FUNCTION_INVOCATION_TIMEOUT` (`504`); sequential Edge priming cut cold cron execution to `~20.6s` with zero duplicate LLM calls.
- **Thread**:
  - **coding_agent (`antigravity`)**: First live production smoke test of `/api/cron` timed out at `60,053ms` (`504`) because Isolate A synthesized in-process with `forceRefresh` while Isolate B repeated the full cold Chronicle PDF + Parallel pass for `/`; priming `/api/chronicle` then `/` over HTTP resolved the timeout and halved Parallel API usage.

## D-7 · Delete dead legacy files now and defer `hermes` cron retirement and Git history rewrite until physical TRMNL cutover

- **Type / Outcome**: `choice` -> `follow_up` · **Credit**: `person` · **Anchor**: [README.md](../../README.md)
- **Summary**: Deleted unused shell scripts (`setup.sh`, `run.sh`), Python tests, legacy research reports, `package-lock.json`, and `.github/workflows/pages.yml` from `main` immediately, leaving `hermes` cron shutdown and any optional Git history compaction until after the physical TRMNL Screenshot plugin is pointed at Vercel.
- **Resolution**: Removing dead code keeps the repository clean without risking a blank screen on the store TRMNL before its dashboard URL is switched over.
- **Thread**:
  - **person**: Clean up all the unused legacy junk right now—if we don't use it we don't need it—and cut over the TRMNL device once Vercel is live.

## D-8 · Expose `/admin` publicly without secrets and persist run history in cloud KV/Blob with a zero-daemon local JSON fallback

- **Type / Outcome**: `question` -> `decided` · **Credit**: `person` · **Anchor**: [history.ts](../../src/history.ts)
- **Summary**: Added an unlisted public Pressroom Admin route (`/admin` and `/api/admin`) exposing zero secret values, backed by Upstash Redis REST (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) or Vercel Blob (`BLOB_READ_WRITE_TOKEN`) in production and an automatic gitignored local JSON fallback (`logs/dispatch-history.json`) when cloud credentials are unset.
- **Resolution**: Cloud KV/Blob survives serverless cold starts on Vercel, while automatic file fallback gives `mise run dev` durable local history with zero background `redis-server` daemon to manage.
- **Thread**:
  - **coding_agent (`antigravity`)**: Asked whether `/admin` should be public like `/?frame=1` or gated by `CRON_SECRET`, and whether run history should stay ephemeral in-memory or use a persistent cloud store.
  - **person**: I want `/admin` open as an unlisted public route like `/?frame=1` and `/api/state` (with zero secrets exposed), and run history stored in a persistent cloud backend (Upstash Redis / Vercel KV or Vercel Blob).
  - **person**: Should we also run a local Redis instance for local development, or use something simpler?
  - **coding_agent (`antigravity`)**: Kept automatic fallback to gitignored `logs/dispatch-history.json` whenever cloud env vars are absent so local development persists across restarts without installing or running a local Redis daemon.

## D-9 · Extract Cornwall Chronicle PDFs via Parallel `POST /v1/extract` (dynamic fetch policy) before two-track structured synthesis, keeping page-aware `unpdf` only as an origin-WAF fallback

- **Type / Outcome**: `choice` -> `decided` · **Credit**: `person` · **Anchor**: [chronicle.ts](../../src/sources/chronicle.ts)
- **Summary**: Switched *Cornwall Chronicle* PDF ingestion to call Parallel `POST /v1/extract` first (omitting overriding `fetch_policy` limits so Parallel uses its indexed PDF cache and native `15s–60s` PDF fetch window like `platform.parallel.ai/play/extract`), retained page-by-page `unpdf` + display-font de-kerning strictly as an origin-WAF `HTTP 202` fallback, and routed content into concurrent Calendar/Flyer vs Editorial/Lore `json_schema` passes.
- **Resolution**: `POST /v1/extract` natively converts multi-page PDFs into clean Markdown without blind character slicing, while two focused `/v1beta/chat/completions` schemas turn that Markdown into typed `YYYY-MM-DD` events and briefs without exceeding output token timeouts.
- **Thread**:
  - **person**: Check whether Parallel has a native extractor (`platform.parallel.ai/play/extract`), switch over to the real extractor rather than relying solely on local PDF parsing, and route the Chronicle extraction more intelligently.
  - **coding_agent (`antigravity`)**: Switched to `POST /v1/extract` with default dynamic `fetch_policy` (removing an artificial `24h` `max_age_seconds` + `12s` timeout that had tripped `cornwallchronicle.org`'s WAF), split full-issue Markdown cleanly across paragraph boundaries so pages 4–7 are never truncated, and ran Calendar/Flyer and Editorial/Lore schemas concurrently.

## D-10 · Enforce visible prior-year attribution on Broadsheet `headline` + `deck` and rank current briefs ahead of retrospectives

- **Type / Outcome**: `possible_bug` -> `fixed` · **Credit**: `person` · **Anchor**: [synthesize.ts](../../src/synthesize.ts)
- **Summary**: Added `eventDate` and `isRetrospective` metadata to Chronicle briefs so expired hearing notices are dropped and current-month developments rank ahead of prior-year lookbacks, updated `/admin` to badge Poster-only body copy, and added `ensureVisibleYearAttribution()` so any past year (`< currentYear`) cited in `leadStory.body` is deterministically surfaced in `leadStory.headline` and `leadStory.deck`.
- **Resolution**: The Broadsheet poster omits `leadStory.body` by design, so tucking `"2024 election"` inside `body` while running `"Cornwall Tops State in Voter Turnout"` in `headline`/`deck` misled readers into thinking a 2024 Democracy Cup essay was 2026 election news.
- **Thread**:
  - **person**: The extracted data for "Cornwall Tops State in Voter Turnout" (`90.46%` Democracy Cup) notes in the body that it was the `2024` election, but the storefront display omits `2024` so it looks like a `2026` result.
  - **coding_agent (`antigravity`)**: Traced the bug to Page 2 of `November_2026.pdf` (a 2024 turnout lookback) combined with `renderTownBulletinPoster` hiding `leadStory.body` on Broadsheet; added temporal brief filtering/ranking, explicit Broadsheet visibility rules in the synthesis prompt, and a deterministic TypeScript year-attribution guard on `headline` + `deck`.

## D-11 · Provision Upstash Redis or Vercel Blob in Vercel Storage during `/admin` production rollout

- **Type / Outcome**: `choice` -> `follow_up` · **Credit**: `coding_agent` (`antigravity`) · **Anchor**: [fnox.toml](../../fnox.toml)
- **Summary**: Implemented full Upstash Redis REST and Vercel Blob persistence in `src/history.ts` and declared optional env keys in `fnox.toml`, deferring live cloud store provisioning in Vercel Storage until owner-approved production deployment of `/admin`.
- **Resolution**: Deploying to production and modifying Vercel project infrastructure require explicit owner release approval per `AGENTS.md`, and `/admin` degrades cleanly to `/tmp` with an explicit notice banner until KV or Blob credentials are attached.
