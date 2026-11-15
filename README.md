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
# 1. Install dependencies
pnpm install

# 2. Configure API keys in .env (GEMINI_API_KEY required; PARALLEL_API_KEY recommended)
cp .env.example .env

# 3. Run typecheck & unit tests
pnpm typecheck && pnpm test

# 4. Start local server (http://localhost:3000)
pnpm dev
```

### Local Preview URLs
- **Raw `800×480` TRMNL Screenshot target:** `http://localhost:3000/`
- **Interactive bezel + 1-bit e-ink threshold simulator:** `http://localhost:3000/?frame=1`
- **Pin a specific poster or daypart:** `http://localhost:3000/?frame=1&archetype=dispatch&daypart=morning`
- **Inspect synthesized JSON state:** `http://localhost:3000/api/state`
- **Inspect parsed monthly *Cornwall Chronicle* PDF digest:** `http://localhost:3000/api/chronicle`

---

## Vercel Deployment & TRMNL Cutover Recipe

### Phase 1: Deploy to Vercel (Zero Downtime)
`.vercelignore` excludes legacy `output/` binaries so uploads stay ~40 KB.

```bash
# Link & deploy preview
vercel

# Add secrets to Vercel Production
vercel env add GEMINI_API_KEY production
vercel env add PARALLEL_API_KEY production

# Deploy production
vercel --prod
```

*(Note: `vercel.json` schedules `/api/cron` daily at `0 11 * * *` (6:00 AM EST) so deployment works on both Vercel Hobby and Pro plans; `/` sets `Cache-Control: public, s-maxage=900, stale-while-revalidate=86400` so every 15-minute TRMNL poll rotates posters at the CDN edge in <100ms.)*

### Phase 2: Point TRMNL Screenshot Plugin at Vercel
1. Open the TRMNL dashboard (in Safari) → add/configure the **Screenshot** plugin.
2. Set **URL** to `https://<your-project>.vercel.app/` (no `?frame=1`).
3. Set **Refresh Interval** to **15 minutes** (cycles through all 4 posters every hour).

### Phase 3: Retire `hermes` & Shrink `.git` (2.4 GB → <1 MB)
Once the store TRMNL is verified on Vercel:

```bash
# 1. Stop the hourly cron/job on hermes first so it stops pushing output/latest.png

# 2. Archive existing generated images outside the repository
tar -czf ~/cornwall-trmnl-archive-$(date +%Y%m%d).tar.gz output/

# 3. Remove legacy scripts/images and create a clean history-free root branch
rm -rf output bin scripts prompts trmnl_prompt_builder.py test_trmnl_prompt_builder.py
git checkout --orphan clean-main
git add -A
git commit -m "Launch The Cornwall Dispatch on Vercel"
git branch -M clean-main main
git push --force origin main
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```
