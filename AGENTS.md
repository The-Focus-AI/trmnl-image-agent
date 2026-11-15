# AGENTS.md — The Cornwall Dispatch (`trmnl-image-agent`)

Maturity: not yet assessed

<!-- Only an authorized owner sets `alpha`, `client-testing`, or `production`, with date and rationale (handbook/release.md). -->

## Overview

**The Cornwall Dispatch** is a stateless TypeScript `800×480` 1-bit e-ink storefront web application deployed on **Vercel** for the **TRMNL Screenshot** plugin in Cornwall, Connecticut. Every 15 minutes it rotates across 5 single-focus, counter-readable posters (`dispatch`, `broadsheet`, `handbill`, `almanac`, `poster`) synthesized from NOAA/NWS (`BOX/12,35`), USGS Housatonic River (`01199000`), the monthly *Cornwall Chronicle* PDF, and **Parallel Web Systems** (`/v1/extract`, `/v1/search`, `/v1/decisions`, `/v1beta/chat/completions`).

Read these files first before changing product logic or terminology:

- [GLOSSARY.md](./GLOSSARY.md) — ubiquitous domain terms (`Storefront Edition`, `Print Archetype`, `Seasonal Spotlight`, `Daypart`, `Decision Router`).
- [docs/adr/](./docs/adr/) — architectural decision records (`0001` stateless Vercel + Parallel decisions, `0002` composable print archetypes, `0003` calendar-gated seasonal spotlight).
- [docs/testing.md](./docs/testing.md) — verification checks, preview checks, layout/latency thresholds, sign-off gates, and alerting gaps.

## Documented Architectural Exceptions

- **Stateless Vercel Web Handler (`api/*.ts`), no Next.js or database**: `/` rewrites to `/api` and renders self-contained HTML + inline monochrome SVG (`Cache-Control: public, s-maxage=900, stale-while-revalidate=86400`). No PostgreSQL/Neon database is needed or provisioned (see ADR 0001).
- **No client sign-in (`handbook/sign-in.md` N/A)**: `/` is a public storefront display read by the unauthenticated TRMNL Screenshot service; there are no end-user accounts or sessions.
- **No A2A / MCP specialist endpoints (`handbook/agent-services.md`, `handbook/mcp-apps.md`, `handbook/service-access.md` N/A)**: This app consumes upstream public/API feeds rather than serving Workbench specialist JSON-RPC or MCP tools.

## Cloud-First Reproducible Workspace

Develop in a reproducible cloud workspace (Amp orb or Cursor cloud environment) once bootstrapped (`handbook/development.md`). Do not introduce machine-specific paths, global `npm install -g` / `brew install` assumptions, or laptop-only services.

- **Package manager**: Always use `pnpm` (`pnpm-lock.yaml` is the single lockfile; never commit `package-lock.json` or `yarn.lock`).
- **Toolchain & task runner**: Managed via [mise.toml](./mise.toml). Run `mise trust && mise install && mise run install` in a fresh checkout.

### Standard `mise` Tasks

| Task | Command | Purpose |
| --- | --- | --- |
| `mise run setup` | Verifies `OP_SERVICE_ACCOUNT_TOKEN` against the `Cornwall Dispatch` vault, then runs `fnox check` | One-time / post-rotation secret bootstrap check |
| `mise run install` | `pnpm install --frozen-lockfile` + `node scripts/restore-skills.mjs --check` | Reproducible dependency & locked skill verification |
| `mise run dev` | `pnpm run dev` (`tsx watch src/dev.ts`) | Starts local server (`http://localhost:3000/`) |
| `mise run lint` | `pnpm run lint` (`tsc --noEmit`) + `markdownlint-cli2` + skill lock validation | Offline static checks |
| `mise run test` | `pnpm run test` (`vitest run`) | Offline unit & HTTP contract tests |
| `mise run deploy` | Fails closed until Vercel project/team IDs and owner release approval are recorded | Guarded release entry point |
| `mise run secrets:list` | `fnox list` | Lists declared secret keys without resolving values |
| `mise run secrets:check` | `fnox check` | Verifies declared required secrets resolve |

## Secrets & Security Preflight

Secrets are declared by reference in [fnox.toml](./fnox.toml) against vault `"Cornwall Dispatch"` in `thefocusai.1password.com` (no secret values in Git):

- `PARALLEL_API_KEY` — Parallel Web Systems API (`/v1/extract` for web + Chronicle PDFs, `/v1/search`, `/v1/decisions`, and `/v1beta/chat/completions` `json_schema` synthesis).
- `CRON_SECRET` — Bearer token guarding `GET /api/cron` in Preview/Production (`Authorization: Bearer $CRON_SECRET`).

> **Model policy**: This project runs 100% on Parallel Web Systems for LLM/extraction/decision tasks. If Google Gemini is ever used in this repo or tooling, **never use any model prior to Gemini 4** (e.g., use `gemini-4-hydrogen` / `gemini-4-argon` / `gemini-4-carbon`, never `gemini-1.x` / `2.x` / `3.x`).

### Mandatory Secret-File Preflight

1. **Never read, print, echo, or commit secret values** (`.env`, `.env.*`, `.fnox/env`, `OP_SERVICE_ACCOUNT_TOKEN`, or API keys). Verify runtime presence via `GET /api/health` (boolean flags only) or `mise run secrets:list`.
2. **Before creating or writing any local secret or bootstrap file** (`<path>` such as `.fnox/env` or `.env`), always run both checks and stop if either fails:

   ```sh
   git check-ignore -q -- <path>
   test -z "$(git ls-files -- <path>)"
   ```

3. **Always qualify personal 1Password CLI calls** with `--account <org>.1password.com` when an interactive human fallback is explicitly authorized; never run bare `op read` against an ambiguous default account.

## Agent Skills

Installed skills in `.agents/skills/` (`domain-modeling`, `grill-with-docs`, `grilling`) are pinned by full 40-character Git commit SHA and SHA-256 directory hash in [skills-lock.json](./skills-lock.json) and checked by [scripts/restore-skills.mjs](./scripts/restore-skills.mjs). Do not install floating branch refs or overwrite locked skills without updating and validating `skills-lock.json`.

## Release & Governance Guardrails

- Do **not** ratify Draft handbook policies, set `Maturity:` in `AGENTS.md`, merge, deploy to production, rotate credentials, or change public route contracts without explicit owner approval.
- Issue tracking defaults to GitHub Issues on `The-Focus-AI/trmnl-image-agent` (`handbook/work.md`).
