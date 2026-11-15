# Testing and Verification — The Cornwall Dispatch

This document records the active verification checks, preview verification steps, layout/latency thresholds, release sign-off gates, and alerting status per `handbook/release.md` and `recipes/ci.md`.

## Checks

Offline, credential-free checks run identically locally and in `.github/workflows/ci.yml` on `pull_request` and `push` to `main`:

- **Install & locked skill check**: `mise run install` (`pnpm install --frozen-lockfile` + `node scripts/restore-skills.mjs --check`).
- **Static analysis (`lint`)**: `mise run lint` runs:
  - `pnpm run lint` (`tsc --noEmit` strict TypeScript verification across `src/` and `api/`),
  - `markdownlint-cli2 "**/*.md"` against repository documentation,
  - `node scripts/restore-skills.mjs --validate-lock` verifying immutable 40-char Git commit refs and SHA-256 hashes in `skills-lock.json`.
- **Unit & HTTP contract tests (`test`)**: `mise run test` (`vitest run`) verifies:
  - Hard calendar-gated `SeasonalSpotlight` eligibility (`sap-watch`, `mohawk-ski`, `frost-garden`, etc.) in `src/__tests__/seasonal.test.ts`,
  - All 5 `800×480` poster archetypes (`dispatch`, `broadsheet`, `handbill`, `almanac`, `poster`), 15-minute slot rotation, XSS escaping, and `?frame=1` preview controls in `src/__tests__/render.test.ts`,
  - `/api/health` boolean-only secret reporting (zero value leakage), `/api/cron` `CRON_SECRET` bearer-token enforcement, and `/api/admin` full Parallel data view + history persistence in `src/__tests__/api.test.ts`.

## Preview verification

- **Local preview checks (configured)**:
  - Start local server: `PORT=3456 pnpm run dev` (or `mise run dev`).
  - Configuration smoke check: `GET /api/health` returns `200` with `{ ok: true, configured: { parallelApiKey, cronSecret } }`.
  - Raw TRMNL viewport check: inspect `http://localhost:3456/` at `800×480` (`scrollWidth <= 800`, `scrollHeight <= 480`, `>= 14px` minimum font size, `>= 2.5px` SVG stroke width) and `http://localhost:3456/?frame=1` with the 1-bit threshold simulator across all 5 posters.
- **Vercel Preview (`preview/e2e`) gap**:
  - Open gap: Vercel Git integration and automated PR preview Playwright verification (`preview/e2e` commit status per `recipes/ci.md`) are not yet configured until an owner links the Vercel project/team and provisions Preview secrets.

## Benchmarks and thresholds

- **Viewport geometry**: Exact `800×480` px frame with zero horizontal or vertical overflow across all 5 poster archetypes.
- **1-bit e-ink legibility**: Pure `#000000` / `#ffffff` palette in raw TRMNL mode, minimum `14px` label typography (`76px` hero figures), and `>= 2.5px` SVG strokes so lines survive 1-bit thresholding on a 7.5" (~130 DPI) TRMNL panel.
- **Latency budget**:
  - Cold `GET /api/cron` synthesis must complete under Vercel's `60s` `maxDuration` ceiling.
  - Warm `GET /` poster rotation must respond in `< 100ms` (`s-maxage=900, stale-while-revalidate=86400`; measured at `~1.15ms` warm).

## Sign-off gates

- **Product maturity**: `not yet assessed` (`AGENTS.md`). Only an authorized project owner may set `alpha`, `client-testing`, or `production` with date and rationale.
- **Branch protection gap**: `.github/workflows/ci.yml` defines the `check` job, but GitHub branch protection requiring `check` (and `preview/e2e` once Vercel previews are linked) must still be enabled in repository settings by an owner.
- **Production cutover gate**: Before repointing the store TRMNL Screenshot plugin or retiring `hermes`, an owner must link Vercel, set `PARALLEL_API_KEY` and `CRON_SECRET`, and verify `/api/health`, `/api/cron`, and `/` on the deployed Vercel URL.

## Alerting

- **Open gap (not `N/A`)**: Default-branch CI (`.github/workflows/ci.yml` on `main`) and the daily Vercel Cron (`/api/cron` at `0 11 * * *`) do not yet route failures to a team Slack channel or automated GitHub issue alert (`handbook/release.md`, `recipes/ci.md`). Configure failure routing when linking production deployment and team notifications.
