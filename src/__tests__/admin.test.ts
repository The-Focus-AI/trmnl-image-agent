import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminDataPayload, DispatchHistoryEntry, FullDataView } from '../types.js';

function makeFixtureFullView(): FullDataView {
  return {
    capturedAt: '2026-11-15T18:30:00.000Z',
    totalElapsedMs: 2840,
    parallelConfigured: true,
    leadArchetype: 'broadsheet',
    eligibleWindows: [
      {
        id: 'frost_watch',
        label: 'Hard Frost & Late Garden Watch',
        windowRule: 'Oct 1 – Nov 20 when low <= 34F',
        factualContext: 'Overnight low reaches 27°F across Cornwall hollows.',
      },
    ],
    upcomingChronicleEvents: [
      {
        date: '2026-11-20',
        time: '6 PM',
        title: 'Community Potluck Supper',
        location: 'Town Hall',
        summary: 'Neighbors share autumn dishes and local cider.',
        isMajor: true,
      },
    ],
    edition: {
      generatedAt: '2026-11-15T18:30:00.000Z',
      dateLabel: 'SUN, NOV 15',
      editionLabel: 'WEEKEND MIDDAY EDITION',
      volumeLabel: 'CORNWALL VILLAGE • WEST CORNWALL • CORNWALL BRIDGE',
      daypart: 'midday',
      archetype: 'broadsheet',
      alertBanner: null,
      leadStory: {
        kicker: 'AROUND CORNWALL',
        headline: 'Library Opens Pine Street Winter Reading Room',
        deck: 'Afternoon cider and local history exhibits welcome neighbors off the green.',
        body: 'Clear northwest air settles over Cream Hill ahead of a 27-degree frost tonight.',
      },
      weatherCallout: {
        summaryLine: 'Crisp November sun across the Litchfield Hills.',
        lookaheadLine: 'Clear near 27° tonight; bright Monday near 46°.',
      },
      dispatches: [
        {
          kicker: 'LIBRARY',
          headline: 'Author Talk at 4 PM',
          body: 'Local historians discuss West Cornwall covered bridge timber repairs.',
        },
        {
          kicker: 'CONSERVATION',
          headline: 'Ballyhack Trail Work Party',
          body: 'Volunteers cleared blowdowns along the upper stone wall loop.',
        },
        {
          kicker: 'RESERVE BULLETIN',
          headline: 'Third Extracted Bulletin Visible in Admin',
          body: 'Reserve dispatch item preserved in full data view.',
        },
      ],
      upcomingEvents: [
        {
          whenLabel: 'FRI NOV 20',
          title: 'Community Potluck Supper',
          whereAndTime: 'Town Hall • 6 PM',
        },
        {
          whenLabel: 'SAT NOV 28',
          title: 'UCC Holiday Artisans Fair',
          whereAndTime: 'Parish House • 10 AM',
        },
        {
          whenLabel: 'SAT DEC 5',
          title: 'Cornwall Reads Cornwall',
          whereAndTime: 'Library • 5 PM',
        },
        {
          whenLabel: 'SUN DEC 6',
          title: 'Fourth Reserve Calendar Item',
          whereAndTime: 'Village Green • 2 PM',
        },
      ],
      seasonalSpotlight: {
        windowId: 'frost_watch',
        kicker: 'FROST WATCH',
        headline: '27° Valley Radiational Chill',
        metric: '45° / 27°',
        body: 'Skim ice returns to sheltered Cream Hill coves overnight.',
      },
      almanacFeature: {
        whenLabel: 'FRI NOV 20',
        title: 'Community Potluck Supper',
        note: 'Town Hall • 6 PM — Neighbors share autumn dishes and local cider.',
      },
      weather: {
        fetchedAt: '2026-11-15T18:30:00.000Z',
        currentTempF: 43,
        conditions: 'Mostly Sunny',
        wind: 'NW 8 mph',
        highF: 45,
        lowF: 27,
        todayPrecipPct: 5,
        tonightPrecipPct: 0,
        todaySummary: 'Mostly sunny, with a high near 45.',
        tonightSummary: 'Clear, with a low around 27.',
        tomorrowSummary: 'Sunny, with a high near 46.',
        hourly: [],
        periods: [],
        alerts: [],
      },
      river: {
        siteName: 'Housatonic River near Falls Village, CT',
        siteCode: '01199000',
        dischargeCfs: 642,
        gageHeightFt: 2.85,
        waterTempF: 44,
        statusLabel: 'IDEAL WADING',
        anglerNote: 'Clear pocket water beneath the covered bridge.',
        observedAt: '2026-11-15T18:15:00.000Z',
      },
      almanac: {
        dateIso: '2026-11-15',
        weekdayShort: 'SUN',
        weekdayLong: 'Sunday',
        monthDayLabel: 'NOV 15',
        fullDateLabel: 'Sunday, November 15, 2026',
        editionTimeLabel: '1:30 PM',
        daypart: 'midday',
        sunrise: '6:43 AM',
        sunset: '4:34 PM',
        dayLengthLabel: '9h 51m',
        daylightDeltaLabel: '-2m 08s',
        moonPhaseName: 'Waxing Crescent',
        moonIlluminationPct: 28,
        moonPhaseFraction: 0.18,
        phenologyNote: 'Woodsmoke in the hollows and bare stone-wall ridgelines.',
      },
      routingMeta: {
        decisionProvider: 'parallel',
        chronicleIssue: 'NOVEMBER 2026',
      },
    },
    parallel: {
      extract: {
        attempted: true,
        ok: true,
        elapsedMs: 910,
        urls: ['https://www.cornwallct.gov/', 'https://cornwalllibrary.org/'],
        objective: 'Extract Cornwall community announcements',
        results: [
          {
            url: 'https://cornwalllibrary.org/',
            title: 'Cornwall Library — Pine Street',
            publishedAt: '2026-11-14',
            excerpts: [
              'Winter Reading Room hours begin this Sunday with hot cider at 4 PM.',
              'XSS probe <script>alert(1)</script> safely escaped.',
            ],
          },
        ],
        failedResults: [],
      },
      search: {
        attempted: true,
        ok: true,
        elapsedMs: 680,
        objective: 'Find Cornwall CT news and events',
        searchQueries: ['Cornwall CT news events announcements'],
        results: [
          {
            url: 'https://cornwallconservationtrust.org/trails',
            title: 'Ballyhack Preserve Autumn Trail Notice',
            excerpts: ['Upper stone wall loop cleared by Saturday trail crew.'],
          },
        ],
      },
      chronicle: {
        fromCache: false,
        elapsedMs: 1120,
        discoveredMainPdfUrl:
          'https://cornwallchronicle.org/wp-content/uploads/2026/10/November_2026.pdf',
        discoveredInsertPdfUrls: [],
        sourcePdfs: [
          {
            url: 'https://cornwallchronicle.org/wp-content/uploads/2026/10/November_2026.pdf',
            method: 'unpdf',
            charCount: 31400,
          },
        ],
        combinedChars: 31400,
        chunkCount: 2,
        digest: {
          issueLabel: 'NOVEMBER 2026',
          pdfUrl:
            'https://cornwallchronicle.org/wp-content/uploads/2026/10/November_2026.pdf',
          fetchedAt: '2026-11-15T18:29:00.000Z',
          events: [
            {
              date: '2026-11-20',
              time: '6 PM',
              title: 'Community Potluck Supper',
              location: 'Town Hall',
              summary: 'Neighbors share autumn dishes and local cider.',
              isMajor: true,
            },
          ],
          briefs: [
            {
              headline: 'West Cornwall Covered Bridge Timber Inspection',
              detail: 'DOT engineers completed the annual autumn truss check.',
              eventDate: '',
              isRetrospective: false,
            },
            {
              headline: 'Cornwall Recorded 90.46% Turnout in 2024',
              detail: 'Looking back at the 2024 Democracy Cup small-town award.',
              eventDate: '',
              isRetrospective: true,
            },
          ],
          natureAndLore: [
            {
              title: 'Beavers Along Cream Hill Pond',
              snippet: 'Fresh alder cuttings stacked along the north cove.',
              byline: 'A. Neighbor',
            },
          ],
        },
      },
      decisions: {
        provider: 'parallel',
        archetype: 'broadsheet',
        spotlightId: 'frost_watch',
        hasUrgentBanner: false,
        isMohawkSkiOpen: false,
        hasSchoolDisruption: false,
        probabilities: {
          urgent: 0.04,
          skiOpen: 0.08,
          schoolDisruption: 0.02,
        },
        citations: [
          {
            source: 'parallel-decisions',
            url: 'https://www.mohawkmtn.com/snow-report/',
            title: 'Mohawk Mountain Snow Report',
            excerpt: 'Snowmaking preparations underway ahead of Thanksgiving.',
          },
        ],
        elapsedMs: 540,
        rawAnswers: {
          archetype: { choice: 'broadsheet' },
        },
      },
      copySynthesis: {
        provider: 'parallel',
        model: 'lite',
        elapsedMs: 1180,
        contextChars: 6420,
      },
      snippetsSentToSynthesis: [],
    },
  };
}

const fixtureHistory: DispatchHistoryEntry[] = [
  {
    id: '2026-11-15T18:30:00.000Z-midday',
    timestamp: '2026-11-15T18:30:00.000Z',
    trigger: 'cron',
    dateLabel: 'SUN, NOV 15',
    editionLabel: 'WEEKEND MIDDAY EDITION',
    daypart: 'midday',
    leadArchetype: 'broadsheet',
    spotlightId: 'frost_watch',
    decisionProvider: 'parallel',
    copyProvider: 'parallel',
    headline: 'Library Opens Pine Street Winter Reading Room',
    alertBanner: null,
    weatherSummary: '43°F Mostly Sunny (H:45° L:27°)',
    riverSummary: '642 CFS (IDEAL WADING)',
    chronicleIssue: 'NOVEMBER 2026',
    counts: {
      extractedPages: 1,
      searchHits: 1,
      decisionCitations: 1,
      chronicleEvents: 1,
      chronicleBriefs: 1,
    },
    elapsedMs: 2840,
  },
];

const mockBuildAdminDataPayload = vi.fn(
  async (): Promise<AdminDataPayload> => ({
    generatedAt: '2026-11-15T18:30:05.000Z',
    storage: {
      backend: 'upstash-redis',
      persistentInCloud: true,
      configured: {
        upstashRedis: true,
        vercelBlob: false,
      },
    },
    currentView: makeFixtureFullView(),
    history: fixtureHistory,
  }),
);

vi.mock('../synthesize.js', () => ({
  buildAdminDataPayload: (...args: unknown[]) => mockBuildAdminDataPayload(...(args as [])),
}));

import { GET as handleAdminGet, POST as handleAdminPost } from '../../api/admin.js';
import { getStorageStatus, listHistory, recordSynthesisRun } from '../history.js';

describe('/admin page, /api/admin JSON, and persistent cloud history', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    mockBuildAdminDataPayload.mockClear();
  });

  it('renders full Parallel extracted content and run history on GET /admin while escaping XSS and never leaking secrets', async () => {
    process.env.PARALLEL_API_KEY = 'secret-parallel-key-do-not-leak';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'secret-upstash-token-do-not-leak';
    process.env.BLOB_READ_WRITE_TOKEN = 'secret-blob-token-do-not-leak';

    const res = await handleAdminGet(new Request('http://localhost:3000/admin'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('private, no-store');

    const html = await res.text();
    // Verifies full Parallel extracted items across all endpoints
    expect(html).toContain('Winter Reading Room hours begin this Sunday');
    expect(html).toContain('Ballyhack Preserve Autumn Trail Notice');
    expect(html).toContain('West Cornwall Covered Bridge Timber Inspection');
    expect(html).toContain('Beavers Along Cream Hill Pond');
    expect(html).toContain('Third Extracted Bulletin Visible in Admin');
    expect(html).toContain('Fourth Reserve Calendar Item');
    expect(html).toContain('Mohawk Mountain Snow Report');
    expect(html).toContain('RETROSPECTIVE');
    expect(html).toContain('POSTER BODY ONLY (hidden on Broadsheet card)');
    // Verifies high-level history entry
    expect(html).toContain('UPSTASH REDIS (PERSISTENT)');
    expect(html).toContain('CRON');
    // Verifies XSS escaping and secret isolation
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('secret-parallel-key-do-not-leak');
    expect(html).not.toContain('secret-upstash-token-do-not-leak');
    expect(html).not.toContain('secret-blob-token-do-not-leak');
  });

  it('returns structured AdminDataPayload JSON when ?format=json is requested', async () => {
    const res = await handleAdminGet(
      new Request('http://localhost:3000/admin?format=json'),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const json = (await res.json()) as AdminDataPayload;
    expect(json.storage.backend).toBe('upstash-redis');
    expect(json.history).toHaveLength(1);
    expect(json.currentView.parallel.extract.results[0]?.url).toBe(
      'https://cornwalllibrary.org/',
    );
  });

  it('triggers forced refresh and redirects with 303 on POST /api/admin', async () => {
    const res = await handleAdminPost(
      new Request('http://localhost:3000/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'refresh=1&refreshChronicle=1&daypart=evening',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin?daypart=evening');
    expect(mockBuildAdminDataPayload).toHaveBeenCalledWith({
      requestOrigin: 'http://localhost:3000',
      forceRefresh: true,
      forceChronicleRefresh: true,
      daypartOverride: 'evening',
    });
  });

  it('persists and reads history via Upstash Redis REST pipeline when configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-upstash-token';

    const status = getStorageStatus();
    expect(status.backend).toBe('upstash-redis');
    expect(status.persistentInCloud).toBe(true);

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 1 }, { result: 'OK' }, { result: 'OK' }]), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: [JSON.stringify(fixtureHistory[0])] }]), {
          status: 200,
        }),
      );

    await recordSynthesisRun(fixtureHistory[0], makeFixtureFullView());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [pipelineUrl, pipelineInit] = fetchSpy.mock.calls[0]!;
    expect(pipelineUrl).toBe('https://example-redis.upstash.io/pipeline');
    expect((pipelineInit?.headers as Record<string, string>).Authorization).toBe(
      'Bearer mock-upstash-token',
    );

    const loaded = await listHistory(10);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.headline).toBe('Library Opens Pine Street Winter Reading Room');
  });
});
