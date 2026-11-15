import 'dotenv/config';
import { buildStorefrontEdition } from '../src/synthesize.js';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const startedAt = Date.now();

  // buildStorefrontEdition already fetches NWS, USGS, Chronicle PDF, and live web in parallel!
  const edition = await buildStorefrontEdition({
    requestOrigin: url.origin,
    forceRefresh: true,
  });

  // Touch the public root URL on Vercel so Edge CDN caches the freshly warmed HTML
  if (!url.origin.includes('localhost') && !url.origin.includes('127.0.0.1')) {
    await fetch(`${url.origin}/`, {
      headers: { 'User-Agent': 'CornwallDispatch-CronWarmer/1.0' },
    }).catch(() => null);
  }

  return Response.json(
    {
      ok: true,
      elapsedMs: Date.now() - startedAt,
      dateLabel: edition.dateLabel,
      editionLabel: edition.editionLabel,
      archetype: edition.archetype,
      seasonalSpotlight: edition.seasonalSpotlight.windowId,
      decisionProvider: edition.routingMeta.decisionProvider,
      chronicleIssue: edition.routingMeta.chronicleIssue,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
