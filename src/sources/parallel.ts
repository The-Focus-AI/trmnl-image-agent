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

export async function postParallelJson<T>(
  path: string,
  body: Record<string, unknown>,
  apiKey: string,
  timeoutMs = 10_000,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res = await fetch(`${PARALLEL_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    // Accommodate pak_* Personal Access Keys if an endpoint expects Bearer auth
    if (res.status === 401 && path.includes('/chat/completions')) {
      res = await fetch(`${PARALLEL_BASE}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn(`[parallel] ${path} HTTP ${res.status}: ${txt.slice(0, 240)}`);
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

export async function parallelChatJson<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  model?: 'lite' | 'base' | 'core';
  timeoutMs?: number;
}): Promise<T | null> {
  const apiKey = process.env.PARALLEL_API_KEY?.trim();
  if (!apiKey) return null;

  const {
    systemPrompt,
    userPrompt,
    schemaName,
    schema,
    model = 'lite',
    timeoutMs = 22_000,
  } = params;

  const res = await postParallelJson<{
    choices?: Array<{ message?: { content?: string | null } }>;
  }>(
    '/v1beta/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
    },
    apiKey,
    timeoutMs,
  );

  const rawContent = res?.choices?.[0]?.message?.content;
  if (!rawContent) return null;

  try {
    return JSON.parse(rawContent) as T;
  } catch (err) {
    console.warn(`[parallel] Failed to parse ${schemaName} JSON output:`, err);
    return null;
  }
}

export async function gatherLiveLocalEvidence(
  clock: LocalClock,
): Promise<WebEvidenceSnippet[]> {
  const parallelKey = process.env.PARALLEL_API_KEY?.trim();
  if (!parallelKey) return [];

  const urls = isMohawkWindowOpen(clock)
    ? [...CORNWALL_CORE_URLS, MOHAWK_URL]
    : CORNWALL_CORE_URLS;

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
      8500,
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
      6500,
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

  const parallelKey = process.env.PARALLEL_API_KEY?.trim();
  if (parallelKey) {
    const questions: Record<string, unknown> = {
      hasUrgentBanner: {
        type: 'noul',
        instructions:
          'Is there an active NWS severe weather warning/advisory, a confirmed Region 1 school closure/snow day, or an extraordinary emergency in Cornwall CT today?',
      },
      hasSchoolDisruption: {
        type: 'noul',
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
        type: 'noul',
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
      8500,
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

      const urgentProb = Number(
        res.answers.hasUrgentBanner?.noul ?? res.answers.hasUrgentBanner?.probability ?? 0,
      );
      const skiProb = Number(
        res.answers.isMohawkSkiOpen?.noul ?? res.answers.isMohawkSkiOpen?.probability ?? 0,
      );
      const schoolProb = Number(
        res.answers.hasSchoolDisruption?.noul ??
          res.answers.hasSchoolDisruption?.probability ??
          0,
      );

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
