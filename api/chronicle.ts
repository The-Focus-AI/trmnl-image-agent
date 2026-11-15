import 'dotenv/config';
import { fetchAndParseChronicle } from '../src/sources/chronicle.js';

export async function GET(): Promise<Response> {
  const digest = await fetchAndParseChronicle();
  if (!digest) {
    return Response.json(
      { error: 'Unable to fetch or parse current Cornwall Chronicle PDF' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return Response.json(digest, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
