import 'dotenv/config';
import { renderEditionHtml } from '../src/render/archetypes.js';
import { buildStorefrontEdition } from '../src/synthesize.js';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const archetypeOverride = url.searchParams.get('archetype');
  const daypartOverride = url.searchParams.get('daypart');
  const previewFrame =
    url.searchParams.get('frame') === '1' || url.searchParams.get('preview') === '1';
  const einkSim = url.searchParams.get('eink') !== '0';
  const forceRefresh = url.searchParams.get('refresh') === '1';

  const hasCustomQuery = Boolean(
    archetypeOverride || daypartOverride || previewFrame || forceRefresh,
  );

  const edition = await buildStorefrontEdition({
    archetypeOverride,
    daypartOverride,
    requestOrigin: url.origin,
    forceRefresh,
  });

  const html = renderEditionHtml(edition, { previewFrame, einkSim });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': hasCustomQuery
        ? 'private, no-store'
        : 'public, s-maxage=900, stale-while-revalidate=86400',
    },
  });
}
