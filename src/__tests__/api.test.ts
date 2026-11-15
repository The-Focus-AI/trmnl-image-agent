import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../synthesize.js', () => ({
  buildStorefrontEdition: vi.fn(async () => ({
    dateLabel: 'SUNDAY, NOV 15, 2026',
    editionLabel: 'MORNING EDITION',
    archetype: 'dispatch',
    seasonalSpotlight: { windowId: 'late-autumn' },
    routingMeta: {
      decisionProvider: 'parallel',
      chronicleIssue: 'NOVEMBER 2026',
    },
  })),
}));

import { GET as handleCron } from '../../api/cron.js';
import { GET as handleHealth } from '../../api/health.js';

describe('/api/health and /api/cron contracts', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('returns boolean-only configuration status on /api/health without leaking secret values', async () => {
    process.env.PARALLEL_API_KEY = 'test-parallel-value-never-echo';
    delete process.env.CRON_SECRET;

    const res = await handleHealth();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');

    const rawText = await res.text();
    expect(rawText).not.toContain('test-parallel-value-never-echo');

    const body = JSON.parse(rawText);
    expect(body).toEqual({
      ok: true,
      service: 'cornwall-dispatch',
      configured: {
        parallelApiKey: true,
        cronSecret: false,
      },
    });
  });

  it('rejects unauthenticated or wrong-token /api/cron calls when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 'expected-cron-secret';

    const missingRes = await handleCron(new Request('http://localhost:3000/api/cron'));
    expect(missingRes.status).toBe(401);

    const wrongRes = await handleCron(
      new Request('http://localhost:3000/api/cron', {
        headers: { Authorization: 'Bearer wrong-secret' },
      }),
    );
    expect(wrongRes.status).toBe(401);

    const validRes = await handleCron(
      new Request('http://localhost:3000/api/cron', {
        headers: { Authorization: 'Bearer expected-cron-secret' },
      }),
    );
    expect(validRes.status).toBe(200);
    const body = await validRes.json();
    expect(body.ok).toBe(true);
    expect(body.archetype).toBe('dispatch');
  });
});
