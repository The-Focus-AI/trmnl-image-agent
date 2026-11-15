# CLAUDE.md

Canonical agent and developer instructions live in [AGENTS.md](./AGENTS.md). Read [AGENTS.md](./AGENTS.md), [GLOSSARY.md](./GLOSSARY.md), [docs/adr/](./docs/adr/), and [docs/testing.md](./docs/testing.md) first.

## Summary

- **Application**: **The Cornwall Dispatch** — stateless TypeScript `800×480` 1-bit e-ink web app on Vercel (`api/*.ts` + `src/`) for the TRMNL Screenshot plugin.
- **Package manager & tasks**: Always use `pnpm` and `mise` (`mise run install`, `mise run lint`, `mise run test`, `mise run dev`).
- **Secrets**: Declared in [fnox.toml](./fnox.toml) (`PARALLEL_API_KEY`, `CRON_SECRET` in `thefocusai.1password.com` vault `"Cornwall Dispatch"`). Never read or print `.env` or `.fnox/env`, and never run unqualified `op read` commands without `--account`. Check boolean key presence via `GET /api/health`. Never use any Gemini model prior to Gemini 4.
