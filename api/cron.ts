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
  const isRemote = !url.origin.includes('localhost') && !url.origin.includes('127.0.0.1');

  if (isRemote) {
    // 1. Prime the 24h Edge-cached /api/chronicle route first so synthesis hits CDN in <50ms.
    const chronRes = await fetch(`${url.origin}/api/chronicle`, {
      headers: { 'User-Agent': 'CornwallDispatch-CronWarmer/1.0' },
    }).catch(() => null);
    const chronJson =
      chronRes && chronRes.ok
        ? ((await chronRes.json().catch(() => null)) as { issueLabel?: string } | null)
        : null;

    // 2. Prime the public root route on Vercel Edge CDN (single synthesis pass, zero duplicate LLM calls).
    const rootRes = await fetch(`${url.origin}/`, {
      headers: { 'User-Agent': 'CornwallDispatch-CronWarmer/1.0' },
    });
    await rootRes.text();

    return Response.json(
      {
        ok: rootRes.ok,
        elapsedMs: Date.now() - startedAt,
        chronicleCache: chronRes?.headers.get('x-vercel-cache') ?? 'MISS',
        edgeCache: rootRes.headers.get('x-vercel-cache') ?? 'MISS',
        dateLabel: rootRes.headers.get('x-dispatch-date'),
        editionLabel: rootRes.headers.get('x-dispatch-edition'),
        archetype: rootRes.headers.get('x-dispatch-archetype'),
        seasonalSpotlight: rootRes.headers.get('x-dispatch-spotlight'),
        decisionProvider: rootRes.headers.get('x-dispatch-provider'),
        chronicleIssue:
          rootRes.headers.get('x-dispatch-chronicle') || chronJson?.issueLabel || null,
      },
      {
        status: rootRes.ok ? 200 : 502,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  const edition = await buildStorefrontEdition({
    requestOrigin: url.origin,
    forceRefresh: true,
  });

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
