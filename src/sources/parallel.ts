import { GoogleGenAI } from '@google/genai';
import {
  defaultArchetypeForDaypart,
  isMohawkWindowOpen,
  type LocalClock,
} from '../seasonal.js';
import type {
  ArchetypeId,
  ChronicleDigest,
  Daypart,
  DecisionRoutingResult,
  EligibleSeasonalCandidate,
  RiverData,
  SeasonalWindowId,
  WeatherData,
  WebEvidenceSnippet,
} from '../types.js';

const PARALLEL_BASE = 'https://api.parallel.ai';

const CORNWALL_CORE_URLS = [
  'https://www.cornwallct.gov/',
  'https://cornwalllibrary.org/',
  'https://cornwallconservationtrust.org/',
  'https://hughesmemorialunion.com/',
  'https://region1schools.org/',
];

const MOHAWK_URL = 'https://www.mohawkmtn.com/snow-report/';

async function postParallelJson<T>(
  path: string,
  body: Record<string, unknown>,
  apiKey: string,
  timeoutMs = 7500,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${PARALLEL_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn(`[parallel] ${path} HTTP ${res.status}: ${txt.slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[parallel] ${path} error:`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function gatherLiveLocalEvidence(
  clock: LocalClock,
): Promise<WebEvidenceSnippet[]> {
  const parallelKey = process.env.PARALLEL_API_KEY;
  const urls = isMohawkWindowOpen(clock)
    ? [...CORNWALL_CORE_URLS, MOHAWK_URL]
    : CORNWALL_CORE_URLS;

  if (parallelKey) {
    const [extractRes, searchRes] = await Promise.all([
      postParallelJson<any>(
        '/v1/extract',
        {
          urls,
          objective: `Extract current ${clock.dateIso} community announcements, upcoming events, library/market programs, school schedule alerts, and ski trail status for Cornwall, Connecticut.`,
          advanced_settings: {
            full_content: false,
          },
        },
        parallelKey,
        7500,
      ),
      postParallelJson<any>(
        '/v1/search',
        {
          objective: `Find recent local community news, road/bridge notices, outdoor conditions, and cultural events in Cornwall CT, Region 1 Schools, and Litchfield County around ${clock.dateIso}. Exclude national politics and crime.`,
          search_queries: [
            'Cornwall CT news events announcements',
            'Region 1 schools Cornwall Consolidated Housatonic news',
            'West Cornwall Cornwall Bridge Litchfield County events',
          ],
          mode: 'fast',
          advanced_settings: {
            max_results: 6,
          },
        },
        parallelKey,
        5500,
      ),
    ]);

    const snippets: WebEvidenceSnippet[] = [];

    for (const item of extractRes?.results ?? []) {
      const excerpt = Array.isArray(item.excerpts)
        ? item.excerpts.join(' ').slice(0, 500)
        : String(item.full_content ?? '').slice(0, 500);
      if (excerpt.trim()) {
        snippets.push({
          source: 'parallel-extract',
          url: String(item.url ?? ''),
          title: String(item.title ?? item.url ?? 'Local Cornwall Page'),
          excerpt: excerpt.trim(),
          publishedAt: item.publish_date ? String(item.publish_date) : undefined,
        });
      }
    }

    for (const item of searchRes?.results ?? []) {
      const excerpt = Array.isArray(item.excerpts)
        ? item.excerpts.join(' ').slice(0, 420)
        : '';
      if (excerpt.trim()) {
        snippets.push({
          source: 'parallel-search',
          url: String(item.url ?? ''),
          title: String(item.title ?? 'Northwest Corner Dispatch'),
          excerpt: excerpt.trim(),
          publishedAt: item.publish_date ? String(item.publish_date) : undefined,
        });
      }
    }

    return snippets;
  }

  // Fallback when PARALLEL_API_KEY is not set yet: fast Gemini Google Search (bounded to 12s)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return [];

  try {
    const client = new GoogleGenAI({ apiKey: geminiKey });
    const searchPromise = client.interactions.create({
      model: 'gemini-4-hydrogen',
      store: false,
      tools: [{ type: 'google_search' }],
      input: `Today is ${clock.dateIso}. Search current local news and announcements for Cornwall CT (cornwallct.gov, cornwalllibrary.org, Cornwall Conservation Trust, Region 1 Schools) and return 4 concise, storefront-friendly items. Exclude national politics and crime.`,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  title: { type: 'string' },
                  excerpt: { type: 'string' },
                },
                required: ['url', 'title', 'excerpt'],
              },
            },
          },
          required: ['items'],
        },
      },
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 12_000),
    );
    const interaction = await Promise.race([searchPromise, timeoutPromise]);
    if (!interaction) {
      console.warn('[parallel-fallback] Gemini search timed out at 12s; continuing with Chronicle + NWS');
      return [];
    }

    const parsed = JSON.parse(interaction.output_text || '{"items":[]}');
    return (parsed.items ?? []).map((it: any) => ({
      source: 'gemini-grounding',
      url: String(it.url ?? ''),
      title: String(it.title ?? ''),
      excerpt: String(it.excerpt ?? '').slice(0, 420),
    }));
  } catch (err) {
    console.warn('[parallel-fallback] Gemini search failed:', err);
    return [];
  }
}

const ARCHETYPE_CRITERIA: Record<ArchetypeId, string> = {
  dispatch:
    'SKY & RIVER POSTER — Giant Cornwall temperature, 12-hour forecast curve, and Housatonic River CFS. Best lead card on crisp mornings, changing skies, or prime river/mountain days.',
  broadsheet:
    'TOWN BULLETIN POSTER — One bold 36px Cornwall headline plus two punchy civic/community bullet takeaways. Best lead card when notable local Cornwall news or Town Meeting notices are fresh.',
  handbill:
    'COMING UP EVENTS POSTER — Three upcoming Cornwall community events in big counter-readable rows. Best lead card Thu–Sun or whenever talks, fairs, concerts, or markets are coming right up.',
  almanac:
    'ALMANAC & WOODS POSTER — Giant woodcut lunar phase medallion, sunrise/sunset daylight shift, and seasonal phenology spotlight. Best lead card on calm afternoons and evenings.',
  poster:
    'URGENT ADVISORY POSTER — Full-screen striped bulletin reserved ONLY for active NWS severe weather warnings/advisories, school closures/snow days, or a marquee town-wide festival happening TODAY.',
};

export async function routeEditionWithDecisions(params: {
  clock: LocalClock;
  daypart: Daypart;
  weather: WeatherData;
  river: RiverData;
  eligibleWindows: EligibleSeasonalCandidate[];
  chronicle: ChronicleDigest | null;
  liveEvidence: WebEvidenceSnippet[];
  archetypeOverride?: ArchetypeId | null;
}): Promise<DecisionRoutingResult> {
  const {
    clock,
    daypart,
    weather,
    river,
    eligibleWindows,
    chronicle,
    liveEvidence,
    archetypeOverride,
  } = params;

  const fallbackArchetype =
    archetypeOverride ??
    defaultArchetypeForDaypart(daypart, clock, weather.alerts.length > 0);
  const fallbackSpotlight: SeasonalWindowId = eligibleWindows[0]?.id ?? 'winter_hearth';

  const spotlightCriteria: Record<string, string> = {};
  for (const w of eligibleWindows) {
    spotlightCriteria[w.id] = `${w.label} (${w.windowRule}): ${w.factualContext}`;
  }
  const hasMultipleSpotlights = Object.keys(spotlightCriteria).length >= 2;

  const sharedStateSummary = {
    location: 'Cornwall, Litchfield County, Connecticut',
    date: clock.dateIso,
    daypart,
    weather: {
      currentTempF: weather.currentTempF,
      highF: weather.highF,
      lowF: weather.lowF,
      conditions: weather.conditions,
      alerts: weather.alerts.map((a) => a.event),
      todaySummary: weather.todaySummary,
      tonightSummary: weather.tonightSummary,
    },
    housatonicRiver: {
      cfs: river.dischargeCfs,
      status: river.statusLabel,
    },
    eligibleSeasonalWindows: eligibleWindows,
    chronicleUpcomingEvents: (chronicle?.events ?? []).slice(0, 8),
    chronicleBriefs: (chronicle?.briefs ?? []).slice(0, 5),
    liveWebSnippets: liveEvidence.slice(0, 6),
  };

  // 1. Primary path: Parallel Decisions API (/v1/decisions) — live-web-grounded!
  const parallelKey = process.env.PARALLEL_API_KEY;
  if (parallelKey) {
    const questions: Record<string, unknown> = {
      hasUrgentBanner: {
        type: 'boolean',
        instructions:
          'Is there an active NWS severe weather warning/advisory, a confirmed Region 1 school closure/snow day, or an extraordinary emergency in Cornwall CT today?',
      },
      hasSchoolDisruption: {
        type: 'boolean',
        instructions:
          'Does Region 1 Schools (Cornwall Consolidated School or Housatonic Valley Regional High School) have a snow day, delay, or unscheduled closure today or tomorrow?',
      },
      archetype: {
        type: 'choice',
        instructions: `Select the best-fitting 800x480 print Archetype for the ${daypart.toUpperCase()} Edition at a Cornwall storefront on ${clock.dateIso}.`,
        criteria: ARCHETYPE_CRITERIA,
      },
    };

    if (isMohawkWindowOpen(clock)) {
      questions.isMohawkSkiOpen = {
        type: 'boolean',
        instructions:
          'Is Mohawk Mountain Ski Area in Cornwall CT currently open with lift-served skiing/riding trails today?',
      };
    }

    if (hasMultipleSpotlights) {
      questions.spotlight = {
        type: 'choice',
        instructions:
          'Among ONLY these calendar-eligible Cornwall seasonal windows, pick the single most relevant and authentic spotlight for today.',
        criteria: spotlightCriteria,
      };
    }

    const res = await postParallelJson<any>(
      '/v1/decisions',
      {
        state: sharedStateSummary,
        questions,
      },
      parallelKey,
      6500,
    );

    if (res?.answers) {
      const chosenArch = String(res.answers.archetype?.choice ?? fallbackArchetype);
      const validArch: ArchetypeId =
        archetypeOverride ??
        (['broadsheet', 'handbill', 'almanac', 'dispatch', 'poster'].includes(chosenArch)
          ? (chosenArch as ArchetypeId)
          : fallbackArchetype);

      const chosenSpot = String(res.answers.spotlight?.choice ?? fallbackSpotlight);
      const validSpot: SeasonalWindowId = eligibleWindows.some((w) => w.id === chosenSpot)
        ? (chosenSpot as SeasonalWindowId)
        : fallbackSpotlight;

      const urgentProb = Number(res.answers.hasUrgentBanner?.probability ?? 0);
      const skiProb = Number(res.answers.isMohawkSkiOpen?.probability ?? 0);
      const schoolProb = Number(res.answers.hasSchoolDisruption?.probability ?? 0);

      const citations: WebEvidenceSnippet[] = (res.citations ?? []).map((c: any) => ({
        source: 'parallel-decisions',
        url: String(c.url ?? ''),
        title: String(c.title ?? 'Verified Web Source'),
        excerpt: Array.isArray(c.excerpts) ? c.excerpts.join(' ').slice(0, 350) : '',
      }));

      return {
        provider: 'parallel',
        archetype: validArch,
        spotlightId: validSpot,
        hasUrgentBanner: weather.alerts.length > 0 || urgentProb >= 0.75,
        isMohawkSkiOpen: skiProb >= 0.65,
        hasSchoolDisruption: schoolProb >= 0.7,
        probabilities: {
          urgent: urgentProb,
          skiOpen: skiProb,
          schoolDisruption: schoolProb,
        },
        citations,
      };
    }
  }

  // 2. Fallback path when PARALLEL_API_KEY is not set: Gemini Decisions API (gemini-decision-1, v1beta)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey, apiVersion: 'v1beta' });
      const questions: Record<string, any> = {
        hasUrgentBanner: {
          type: 'noul',
          instructions:
            'Based on the weather alerts and local snippets, is there an active NWS weather warning/advisory or emergency school closure requiring a top alert banner today?',
        },
        archetype: {
          type: 'choice',
          instructions: `Choose the best print Archetype for the ${daypart.toUpperCase()} Edition at a public store counter in Cornwall, CT.`,
          criteria: ARCHETYPE_CRITERIA,
        },
      };

      if (hasMultipleSpotlights) {
        questions.spotlight = {
          type: 'choice',
          instructions:
            'Which eligible seasonal window is the most compelling, accurate Seasonal Spotlight for Cornwall today?',
          criteria: spotlightCriteria,
        };
      }

      const decisionRes = await ai.decisions.create({
        model: 'gemini-decision-1',
        input: JSON.stringify(sharedStateSummary),
        questions,
      });

      const answers: Record<string, any> = decisionRes.answers ?? {};
      const chosenArch = String(answers.archetype?.choice ?? fallbackArchetype);
      const validArch: ArchetypeId =
        archetypeOverride ??
        (['broadsheet', 'handbill', 'almanac', 'dispatch', 'poster'].includes(chosenArch)
          ? (chosenArch as ArchetypeId)
          : fallbackArchetype);

      const chosenSpot = String(answers.spotlight?.choice ?? fallbackSpotlight);
      const validSpot: SeasonalWindowId = eligibleWindows.some((w) => w.id === chosenSpot)
        ? (chosenSpot as SeasonalWindowId)
        : fallbackSpotlight;

      const urgentProb = Number(answers.hasUrgentBanner?.noul ?? 0);

      return {
        provider: 'gemini',
        archetype: validArch,
        spotlightId: validSpot,
        hasUrgentBanner: weather.alerts.length > 0 || urgentProb >= 0.75,
        isMohawkSkiOpen: false,
        hasSchoolDisruption: false,
        probabilities: { urgent: urgentProb },
        citations: [],
      };
    } catch (err) {
      console.warn('[decisions] Gemini Decisions fallback failed:', err);
    }
  }

  return {
    provider: 'deterministic',
    archetype: fallbackArchetype,
    spotlightId: fallbackSpotlight,
    hasUrgentBanner: weather.alerts.length > 0,
    isMohawkSkiOpen: false,
    hasSchoolDisruption: false,
    probabilities: {},
    citations: [],
  };
}
