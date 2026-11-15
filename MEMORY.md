# trmnl-image-agent MEMORY

Updated: 2026-11-15

## Purpose

Serve **The Cornwall Dispatch**, a stateless `800×480` 1-bit e-ink storefront display for Cornwall, Connecticut on Vercel, polled every 15 minutes by the TRMNL Screenshot plugin.

## Entry Points

- `api/index.ts` (`/` and `/?frame=1`) — `800×480` 1-bit HTML + inline monochrome SVG poster cards
- `api/admin.ts` (`/admin` and `/api/admin`) — Pressroom Admin full Parallel extraction inspector + persistent high-level run history
- `api/state.ts` (`/api/state`) — synthesized JSON `StorefrontEdition`
- `api/chronicle.ts` (`/api/chronicle`) — cached monthly *Cornwall Chronicle* PDF digest
- `api/cron.ts` (`/api/cron`) — daily Vercel Cron cache warmer (`Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set)
- `api/health.ts` (`/api/health`) — boolean-only secret configuration smoke check
- `src/dev.ts` — local HTTP development server

## Commands

- bootstrap tools: `mise trust && mise install`
- install & check skills: `mise run install`
- lint: `mise run lint`
- test: `mise run test`
- dev server: `mise run dev`

## Secret Refs (`fnox.toml`)

- `PARALLEL_API_KEY` (required at runtime for Parallel `/v1/extract`, `/v1/search`, `/v1/decisions`, and `/v1beta/chat/completions`)
- `CRON_SECRET` (recommended in Preview/Production for Vercel Cron auth on `/api/cron`)
