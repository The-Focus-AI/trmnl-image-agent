import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import { buildStorefrontEdition } from '../src/synthesize.js';

function isAuthorizedCronRequest(request: Request, cronSecret: string): boolean {
  const expected = Buffer.from(`Bearer ${cronSecret}`, 'utf8');
  const actual = Buffer.from(request.headers.get('authorization') ?? '', 'utf8');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && !isAuthorizedCronRequest(request, cronSecret)) {
    return Response.json(
      { ok: false, error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

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
