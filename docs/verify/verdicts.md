# Verification Report — The Cornwall Dispatch (`specVersion: 2`)

- **Verified At**: `2026-11-15T21:21:00Z`
- **Production Deployment**: `https://trmnl-image-agent.vercel.app` (`trmnl-image-agent-555p0313w-thefocusai.vercel.app`)
- **Git State**: `3b52e0e+dirty` (`main` working tree deployed to Vercel production)
- **Mode**: `mode-1-passive-plus-live-vercel-production-browser-verification`
- **Machine-Readable Report**: [verdicts.json](./verdicts.json)
- **Contract Inputs**: [spec.md](./spec.md) (`v2`), [decisions.json](./decisions.json) (`D-1..D-11`), [AGENTS.md](../../AGENTS.md), [testing.md](../testing.md), [docs/adr/](../adr/)

## Summary

| Layer | `pass` | `fail` | `inconclusive` | `waived` |
| --- | ---: | ---: | ---: | ---: |
| **Acceptance Criteria (`AC-1..AC-5`)** | **5** | 0 | 0 | 0 |
| **Persistent Invariants (`INV-1..INV-6`)** | **6** | 0 | 0 | 0 |

---

## Task Acceptance Criteria Verdicts (`AC-1..AC-5`)

| ID | Verdict | Summary Evidence |
| --- | --- | --- |
| **AC-1** | `pass` | `GET /admin` (`200`, `text/html`, `Cache-Control: private, no-store`) and `GET /admin?format=json` (`200`, `application/json`) verified via `src/__tests__/admin.test.ts` (4/4), in-process XSS/secret-redaction drill, and host-verified live browser audit on `https://trmnl-image-agent.vercel.app/admin` and `/admin?format=json` confirming all 8 sections, `POSTER BODY ONLY (hidden on Broadsheet card)` badge, and zero exposed tokens. |
| **AC-2** | `pass` | `POST /api/admin` verified in [admin.ts](../../api/admin.ts), [history.ts](../../src/history.ts), `src/__tests__/admin.test.ts` (Upstash `/pipeline` Bearer POST + `303` redirect), and live browser click on `↻ Re-Extract & Synthesize` (`+PDF` checked) at `https://trmnl-image-agent.vercel.app/admin` redirecting back to `/admin` and recording `ADMIN REFRESH` (`status: "ok"`, `durationMs: 37609`) in `#history`. |
| **AC-3** | `pass` | [chronicle.ts](../../src/sources/chronicle.ts) verified via `src/__tests__/seasonal.test.ts`, mocked `POST /v1/extract` payload check, and live production `/admin` refresh discovering `November_2026.pdf` + `InsertCCFINAL.pdf` (`unpdf (29,790 chars) • parallel-extract (271 chars)`) and extracting `36` upcoming events (`60` total) and `16` town briefs. |
| **AC-4** | `pass` | [synthesize.ts](../../src/synthesize.ts) (`filterCurrentChronicleBriefs` + `ensureVisibleYearAttribution`), `src/__tests__/seasonal.test.ts` (proving `2024` appears in Broadsheet headline + deck whenever a `2024` brief leads), and live `https://trmnl-image-agent.vercel.app/?archetype=broadsheet` prioritizing current November civic news (`"Town Meeting Sets Cornwall's Next Moves"`) ahead of retrospective `2024` lookbacks. |
| **AC-5** | `pass` | Live browser audit at `800×480` on `https://trmnl-image-agent.vercel.app` confirmed `scrollWidth = 800`, `scrollHeight = 480`, and `0` bezel/toolbar nodes across `/` and all 5 `?archetype=` values; in-process HTTP drill verified `Cache-Control` headers and `GET /api/cron` (`401`/`200`, `trigger: "cron"`); `fnox --non-interactive --profile runtime check` exited `0` with zero warnings. |

---

## Persistent Repository & Deployment Invariant Findings (`INV-1..INV-6`)

| ID | Invariant | Verdict | Evidence |
| --- | --- | --- | --- |
| **INV-1** | 100% Parallel Web Systems & Zero Pre-Gemini-4 Models (`AGENTS.md`, ADR 0001) | `pass` | `grep -rnE '@google/genai\|GEMINI_API_KEY\|gemini-[123]\.' src/ api/ package.json` returned `0` matches; live `/admin` confirmed `decisionProvider: "parallel"` (`/v1/decisions` in `561 ms`). |
| **INV-2** | Secret Isolation, Boolean-Only `/api/health` & Single `pnpm-lock.yaml` (`AGENTS.md`) | `pass` | `.env`, `.fnox/env`, `logs/dispatch-history.json`, and `logs/chronicle-cache.json` verified gitignored & untracked; `pnpm-lock.yaml` is the sole package lockfile; live `https://trmnl-image-agent.vercel.app/api/health` returned `{"ok":true,"service":"cornwall-dispatch","configured":{"parallelApiKey":true,"cronSecret":true}}`. |
| **INV-3** | Reproducible `mise run install` & Locked Skills CI Gate (`AGENTS.md`, `.github/workflows/ci.yml:24`) | `pass` | Recorded SHA-256 hashes for repo-local `spec-extract` and `verify-deploy` in [skills-lock.json](../../skills-lock.json) and updated [restore-skills.mjs](../../scripts/restore-skills.mjs); `mise run install` exited `0` (`Verified 5 installed skills against their recorded hashes`) and `mise run lint` exited `0` (`Validated 5 immutable skill entries`). |
| **INV-4** | `800×480` Zero Overflow, `>= 14px` Type Floor & `>= 2.5px` SVG Strokes (`docs/testing.md:30-31`, ADR 0002) | `pass` | Updated [styles.ts](../../src/render/styles.ts), [archetypes.ts](../../src/render/archetypes.ts), and [svg.ts](../../src/render/svg.ts), added regression assertions in [render.test.ts](../../src/__tests__/render.test.ts) (`25/25` Vitest passing), and verified live at `800×480` across all 5 posters (`scrollWidth = 800`, `scrollHeight = 480`, `minFontSize = 14px`, `minStrokeWidth = 2.5px–3.1px`). |
| **INV-5** | Hard Calendar Seasonal Gates Before Parallel Decisions (ADR 0003) | `pass` | Verified in [seasonal.ts](../../src/seasonal.ts), `src/__tests__/seasonal.test.ts` (12/12 passing), and live Nov 15 `/admin` routing selecting `winter_hearth`. |
| **INV-6** | Live Production Parity at `https://trmnl-image-agent.vercel.app` | `pass` | Deployed `trmnl-image-agent-555p0313w-thefocusai.vercel.app` aliased to `https://trmnl-image-agent.vercel.app` and verified live across `/api/health`, `/admin` (`↻ Re-Extract & Synthesize`), `/admin?format=json`, and all 5 `800×480` posters. |
