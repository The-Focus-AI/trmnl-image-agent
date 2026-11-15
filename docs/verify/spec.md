---
version: 2
updated_at: "2026-11-15T20:52:00Z"
git_head: "3b52e0e"
---

# Specification — The Cornwall Dispatch

## Intent

Build a public admin page that shows the full data view of everything extracted and synthesized by Parallel alongside a high-level history of past runs backed by persistent cloud storage with a zero-daemon local fallback. Switch monthly Cornwall Chronicle PDF and town web extraction onto Parallel's native extractor with two-track calendar and editorial routing, and ensure prior-year statistics such as 2024 election turnout always carry their year visibly on the storefront display rather than hiding inside poster-only body copy.

## Acceptance Criteria

- **AC-1**: `GET /admin` returns HTTP `200` HTML (`Cache-Control: private, no-store`) and `GET /admin?format=json` returns HTTP `200` JSON exposing the active storefront edition, Parallel web extract and search results, *Cornwall Chronicle* PDF extraction trace, Decisions routing probabilities and citations, synthesized copy slots (distinguishing Broadsheet-visible lead copy from Poster-only body copy), upstream sensor and almanac feeds, and recorded run history while escaping untrusted HTML and leaking zero secret or token values.
- **AC-2**: `POST /api/admin` triggers a fresh synthesis pass (clearing and re-parsing the cached *Cornwall Chronicle* PDF digest when `refreshChronicle=1` is submitted), records a run-history entry persisted via Upstash Redis REST (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) or Vercel Blob (`BLOB_READ_WRITE_TOKEN`) when configured or local disk fallback otherwise, and responds with HTTP `303` redirecting to `/admin`.
- **AC-3**: Monthly *Cornwall Chronicle* discovery and ingestion request all discovered issue and insert PDFs through Parallel `POST /v1/extract` (falling back to local page-by-page PDF parsing only on upstream crawl failure) to populate `GET /api/chronicle` and storefront upcoming events strictly on or after the current Cornwall date while excluding past dates, routine municipal board or Zoom meetings, and wildlife trivia.
- **AC-4**: Expired dated hearing and meeting notices are excluded from town briefs, current-month briefs take precedence over retrospective lookbacks, and whenever a lead story references a prior-year statistic or award (such as `2024` election turnout) in its body copy, that 4-digit year appears visibly in the `broadsheet` poster's rendered headline or deck rather than solely in Poster-only body text.
- **AC-5**: `GET /` renders self-contained `800×480` black-and-white HTML across all five `archetype` values (`dispatch`, `broadsheet`, `handbill`, `almanac`, `poster`) with `Cache-Control: public, s-maxage=900, stale-while-revalidate=86400` on default requests (`private, no-store` when query overrides are present), `GET /api/cron` tags scheduled warm-ups in run history while enforcing `CRON_SECRET` when set, and `fnox --profile runtime check` succeeds without 1Password warnings when optional cloud-storage variables are unprovisioned.

## Scenario Guidance

- **Local preview & admin server**: Run `PORT=3456 mise run dev` (or `PORT=3456 pnpm run dev` for deterministic offline checks without 1Password secrets) and inspect `http://localhost:3456/`, `http://localhost:3456/?frame=1`, `http://localhost:3456/admin`, and `http://localhost:3456/admin?format=json`.
- **Live production deployment**: `https://trmnl-image-agent.vercel.app` (Vercel team `thefocusai`, project `trmnl-image-agent`, deployment `trmnl-image-agent-555p0313w-thefocusai.vercel.app`).
- **Offline verification suite**:
  - `mise run install` — runs `pnpm install --frozen-lockfile` and `node scripts/restore-skills.mjs --check` (`5` locked skills verified by SHA-256).
  - `mise run lint` — runs `tsc --noEmit`, `markdownlint-cli2 "**/*.md"`, and `node scripts/restore-skills.mjs --validate-lock`.
  - `mise run test` — runs `vitest run` (`25` unit and HTTP contract tests across seasonal gates, temporal brief filtering, Broadsheet visible-year attribution, `800×480` poster rendering + `>= 14px` font / `>= 2.5px` stroke floors, `/admin` HTML/JSON/POST/Redis contracts, and `/api/health` + `/api/cron`).
  - `fnox --non-interactive --profile runtime check` — verifies secret declarations in `fnox.toml` without hanging on interactive 1Password prompts.
- **Local run-history & PDF cache paths**: Local history persists to gitignored `logs/dispatch-history.json` (`/tmp/cornwall-dispatch-history.json` on Vercel when cloud KV/Blob env vars are unset), and the 24-hour Chronicle digest cache persists to `logs/chronicle-cache.json`.
- **Secret-safe live checks**: Execute authenticated `/api/cron` or live Parallel checks inside `fnox --non-interactive --profile runtime exec -- node --input-type=module --import tsx -e '...'` reading `process.env` in-process so secret values never enter shell history, process arguments, or logs.

## Open Callouts

- **Optional Vercel cloud store attachment (`follow_up`)**: Production `https://trmnl-image-agent.vercel.app/admin` currently uses `/tmp/cornwall-dispatch-history.json` within warm serverless instances until `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `BLOB_READ_WRITE_TOKEN`) are attached in Vercel Storage.
- **Uncommitted local working tree (`follow_up`)**: Production `https://trmnl-image-agent.vercel.app` was deployed directly from the verified working tree on top of `3b52e0e`; commit and push to `main` when ready to sync Git history with live production.
- **Carry-forward route caveats**: `api/cron.ts` enforces bearer authentication only when `CRON_SECRET` is non-empty (`CRON_SECRET` is verified `true` in production `/api/health`), and `api/state.ts` unconditionally sets `Cache-Control: public, s-maxage=900, stale-while-revalidate=3600` even when `?refresh=1` is passed.
