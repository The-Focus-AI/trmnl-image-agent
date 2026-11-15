# The Cornwall Dispatch

Stateless `800×480` 1-bit e-ink storefront display for **Cornwall, Connecticut**, served on **Vercel** for the **TRMNL Screenshot** plugin.

Instead of cramming micro-print onto a 7.5" (~130 DPI) unlit e-paper screen, **The Cornwall Dispatch** rotates every 15 minutes across **5 room-readable, single-focus poster cards** (`16px–76px` typography, sturdy `>=2.5px` strokes, ~35–50 words per card):

1. **`dispatch` — Sky & River Board:** Giant Cornwall temperature (`76px`), bold woodcut sky glyph, live **Housatonic River** CFS (`01199000` at Falls Village), and full-width 12-hour forecast curve.
2. **`broadsheet` — Town Bulletin:** One `38px` local Cornwall headline + two punchy civic/community takeaways.
3. **`handbill` — Coming Up in Cornwall:** Three chronological upcoming Cornwall events in `25px` counter-readable rows.
4. **`almanac` — Almanac & Woods:** Giant `116px` woodcut lunar phase medallion, NOAA sunrise/sunset/daylight delta, and a hard calendar-gated **Seasonal Spotlight**.
5. **`poster` — Special Advisory:** Full-screen diagonal-stripe placard reserved for active NWS warnings, school closures, or marquee town events.

See [GLOSSARY.md](file:///Users/wschenk/The-Focus-AI/trmnl-image-agent/GLOSSARY.md) and [`docs/adr/`](file:///Users/wschenk/The-Focus-AI/trmnl-image-agent/docs/adr/) for domain terms and architecture decisions.

---

## Local Development Recipe

```bash
# 1. Install pinned tools, dependencies, and verify locked agent skills
mise trust && mise install
mise run install

# 2. Verify 1Password secrets ("Cornwall Dispatch" vault in thefocusai.1password.com)
mise run secrets:check

# 3. Run lint & unit tests
mise run lint && mise run test

# 4. Start local server with fnox runtime secrets (http://localhost:3000)
mise run dev
```

### Local Preview URLs
- **Raw `800×480` TRMNL Screenshot target:** `http://localhost:3000/`
- **Interactive bezel + 1-bit e-ink threshold simulator:** `http://localhost:3000/?frame=1`
- **Pressroom Admin (full Parallel data view + run history):** `http://localhost:3000/admin` (`?format=json` for raw JSON)
- **Pin a specific poster or daypart:** `http://localhost:3000/?frame=1&archetype=dispatch&daypart=morning`
- **Inspect synthesized JSON state:** `http://localhost:3000/api/state`
- **Inspect parsed monthly *Cornwall Chronicle* PDF digest:** `http://localhost:3000/api/chronicle`
- **Boolean secret configuration check:** `http://localhost:3000/api/health`

---

## Vercel Deployment & TRMNL Setup Recipe

### 1. Deploy to Vercel

```bash
# Link & deploy preview
pnpm dlx vercel

# Add secrets to Vercel Production
pnpm dlx vercel env add PARALLEL_API_KEY production
pnpm dlx vercel env add CRON_SECRET production

# Optional: Persist /admin run history across cold starts (connect Upstash Redis OR Vercel Blob in Vercel Storage, or set manually)
pnpm dlx vercel env add UPSTASH_REDIS_REST_URL production
pnpm dlx vercel env add UPSTASH_REDIS_REST_TOKEN production
# (Alternative: pnpm dlx vercel env add BLOB_READ_WRITE_TOKEN production)

# Deploy production
pnpm dlx vercel --prod
```

*(Note: `vercel.json` schedules `/api/cron` daily at `0 11 * * *` (6:00 AM EST) so deployment works on both Vercel Hobby and Pro plans; `/` sets `Cache-Control: public, s-maxage=900, stale-while-revalidate=86400` so every 15-minute TRMNL poll rotates posters at the CDN edge in <100ms.)*

### 2. Point TRMNL Screenshot Plugin at Vercel
1. Open the TRMNL dashboard (in Safari) → add/configure the **Screenshot** plugin.
2. Set **URL** to `https://<your-project>.vercel.app/` (no `?frame=1`).
3. Set **Refresh Interval** to **15 minutes** (cycles through all 4 posters every hour).
