import 'dotenv/config';
import { renderAdminHtml } from '../src/render/admin.js';
import { buildAdminDataPayload } from '../src/synthesize.js';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  const daypartOverride = url.searchParams.get('daypart');
  const forceRefresh = url.searchParams.get('refresh') === '1';
  const forceChronicleRefresh = url.searchParams.get('refreshChronicle') === '1';

  const payload = await buildAdminDataPayload({
    requestOrigin: url.origin,
    forceRefresh,
    forceChronicleRefresh,
    daypartOverride,
  });

  if (format === 'json') {
    return Response.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  }

  const html = renderAdminHtml(payload, {
    activeDaypartOverride: daypartOverride,
  });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let daypartOverride = url.searchParams.get('daypart');
  let forceChronicleRefresh = url.searchParams.get('refreshChronicle') === '1';

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text().catch(() => '');
    const params = new URLSearchParams(text);
    if (params.get('daypart')) {
      daypartOverride = params.get('daypart');
    }
    if (params.get('refreshChronicle') === '1') {
      forceChronicleRefresh = true;
    }
  }

  await buildAdminDataPayload({
    requestOrigin: url.origin,
    forceRefresh: true,
    forceChronicleRefresh,
    daypartOverride,
  });

  const redirectUrl = new URL('/admin', url.origin);
  if (daypartOverride) {
    redirectUrl.searchParams.set('daypart', daypartOverride);
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: redirectUrl.pathname + redirectUrl.search,
      'Cache-Control': 'private, no-store',
    },
  });
}
