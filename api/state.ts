import 'dotenv/config';
import { buildStorefrontEdition } from '../src/synthesize.js';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const edition = await buildStorefrontEdition({
    archetypeOverride: url.searchParams.get('archetype'),
    daypartOverride: url.searchParams.get('daypart'),
    requestOrigin: url.origin,
    forceRefresh: url.searchParams.get('refresh') === '1',
  });

  return Response.json(edition, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
}
