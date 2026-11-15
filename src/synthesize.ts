import { GoogleGenAI } from '@google/genai';
import {
  computeDaypart,
  editionTitleForDaypart,
  getCornwallClock,
  getEligibleSeasonalWindows,
  selectRotatingArchetype,
} from './seasonal.js';
import { buildAlmanacData } from './sources/almanac.js';
import { getChronicleDigest } from './sources/chronicle.js';
import {
  gatherLiveLocalEvidence,
  routeEditionWithDecisions,
} from './sources/parallel.js';
import { fetchHousatonicRiver } from './sources/river.js';
import { fetchCornwallWeather } from './sources/weather.js';
import type {
  ArchetypeId,
  ChronicleDigest,
  ChronicleEvent,
  Edition,
  EligibleSeasonalCandidate,
  RiverData,
  SeasonalWindowId,
  WeatherData,
} from './types.js';

function clamp(text: unknown, maxLen: number, fallback = ''): string {
  const s = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return fallback;
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

export function filterUpcomingChronicleEvents(
  events: ChronicleEvent[],
  todayIso: string,
): ChronicleEvent[] {
  return events
    .filter((ev) => {
      const d = ev.date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return d >= todayIso;
      }
      // Keep recurring items (e.g. EVERY THU) unless note indicates ended
      return true;
    })
    .sort((a, b) => {
      const aIso = /^\d{4}-\d{2}-\d{2}$/.test(a.date);
      const bIso = /^\d{4}-\d{2}-\d{2}$/.test(b.date);
      if (aIso && bIso) return a.date.localeCompare(b.date);
      if (aIso) return -1;
      if (bIso) return 1;
      return 0;
    });
}

function formatEventWhen(dateStr: string, todayIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return clamp(dateStr.toUpperCase(), 14, 'WEEKLY');
  }
  if (dateStr === todayIso) return 'TODAY';
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const [ty, tm, td] = todayIso.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td, 12, 0, 0);
  const diffDays = Math.round((targetUtc - todayUtc) / 86_400_000);
  if (diffDays === 1) return 'TOMORROW';
  const dt = new Date(targetUtc);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(dt)
    .toUpperCase();
}

const EDITION_COPY_SCHEMA = {
  type: 'object',
  properties: {
    alertBanner: {
      type: 'string',
      description:
        'ONLY populate when hasUrgentBanner is true (e.g. active NWS warning or confirmed school snow day). Otherwise return empty string "". Max 54 chars.',
    },
    leadStory: {
      type: 'object',
      properties: {
        kicker: {
          type: 'string',
          description: '2-3 uppercase words framing the lead angle (max 20 chars).',
        },
        headline: {
          type: 'string',
          description:
            'Punchy, poster-scale Cornwall headline readable from 8 feet away (max 44 chars, ~6-8 words).',
        },
        deck: {
          type: 'string',
          description: 'One crisp supporting sentence with concrete Cornwall details (max 88 chars).',
        },
        body: {
          type: 'string',
          description:
            'Short second sentence only if needed for Special Poster context (max 110 chars).',
        },
      },
      required: ['kicker', 'headline', 'deck', 'body'],
    },
    weatherCallout: {
      type: 'object',
      properties: {
        summaryLine: {
          type: 'string',
          description: 'Plain-English read on today’s Cornwall sky in <=54 chars.',
        },
        lookaheadLine: {
          type: 'string',
          description: 'Tonight & tomorrow lookahead in <=56 chars.',
        },
      },
      required: ['summaryLine', 'lookaheadLine'],
    },
    dispatches: {
      type: 'array',
      description:
        'Exactly 3 short hyperlocal Town Bulletins (Cornwall Briefs, library/town/school/trail news). Keep each punchy so 2 bullets read cleanly from across a store counter.',
      items: {
        type: 'object',
        properties: {
          kicker: { type: 'string', description: 'Short uppercase tag (max 15 chars).' },
          headline: { type: 'string', description: 'Crisp bullet title (max 38 chars).' },
          body: { type: 'string', description: 'Tight 1-clause detail (max 78 chars).' },
        },
        required: ['kicker', 'headline', 'body'],
      },
    },
    upcomingEvents: {
      type: 'array',
      description: 'Exactly 4 upcoming Cornwall community events in chronological order.',
      items: {
        type: 'object',
        properties: {
          whenLabel: {
            type: 'string',
            description: 'Short uppercase date like TODAY, FRI NOV 20, SAT NOV 28 (max 12 chars).',
          },
          title: { type: 'string', description: 'Event name (max 32 chars).' },
          whereAndTime: {
            type: 'string',
            description: 'Venue + time, e.g. CCS • 7:30 PM or Library • 4 PM (max 30 chars).',
          },
        },
        required: ['whenLabel', 'title', 'whereAndTime'],
      },
    },
    seasonalSpotlight: {
      type: 'object',
      description:
        'Feature box for ONLY the chosen winning SeasonalWindowId. Never invent out-of-season claims.',
      properties: {
        kicker: { type: 'string', description: 'Uppercase label (max 18 chars).' },
        headline: { type: 'string', description: 'Short headline (max 32 chars).' },
        metric: {
          type: 'string',
          description: 'Single compact figure like 642 CFS, 44° / 30°, or 9H 52M (max 12 chars).',
        },
        body: { type: 'string', description: 'Crisp 1-sentence seasonal note (max 86 chars).' },
      },
      required: ['kicker', 'headline', 'metric', 'body'],
    },
    almanacFeature: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short Nature Note or Cornwall Lore title (max 28 chars).',
        },
        note: {
          type: 'string',
          description:
            'Vivid 1-sentence Cornwall naturalist observation or local curiosity (max 98 chars).',
        },
      },
      required: ['title', 'note'],
    },
  },
  required: [
    'alertBanner',
    'leadStory',
    'weatherCallout',
    'dispatches',
    'upcomingEvents',
    'seasonalSpotlight',
    'almanacFeature',
  ],
};

function buildFallbackEditionCopy(params: {
  todayIso: string;
  weather: WeatherData;
  river: RiverData;
  almanacPhenology: string;
  chronicle: ChronicleDigest | null;
  upcomingChronicleEvents: ChronicleEvent[];
  winningWindow: EligibleSeasonalCandidate;
  hasUrgentBanner: boolean;
}) {
  const {
    todayIso,
    weather,
    river,
    almanacPhenology,
    chronicle,
    upcomingChronicleEvents,
    winningWindow,
    hasUrgentBanner,
  } = params;

  const topBrief = chronicle?.briefs?.[0];
  const topLore = chronicle?.natureAndLore?.[0];

  const events = upcomingChronicleEvents.slice(0, 4).map((ev) => ({
    whenLabel: formatEventWhen(ev.date, todayIso),
    title: clamp(ev.title, 36, 'Community Gathering'),
    whereAndTime: clamp(
      [ev.location, ev.time].filter(Boolean).join(' • '),
      34,
      'Cornwall Village',
    ),
  }));

  while (events.length < 4) {
    events.push({
      whenLabel: 'THIS MONTH',
      title: 'See CornwallChronicle.org',
      whereAndTime: 'Town Calendar & Briefs',
    });
  }

  const dispatches = (chronicle?.briefs ?? []).slice(0, 3).map((b) => ({
    kicker: 'TOWN BRIEF',
    headline: clamp(b.headline, 46, 'Cornwall Update'),
    body: clamp(b.detail, 115, ''),
  }));

  while (dispatches.length < 3) {
    dispatches.push({
      kicker: 'HOUSATONIC',
      headline: `River Running ${river.dischargeCfs ?? 'Steady'} CFS`,
      body: clamp(river.anglerNote, 115, weather.todaySummary),
    });
  }

  return {
    alertBanner:
      hasUrgentBanner && weather.alerts[0]
        ? clamp(weather.alerts[0].headline.toUpperCase(), 68)
        : null,
    leadStory: {
      kicker: topBrief ? 'AROUND CORNWALL' : 'CORNWALL SKY & HILLS',
      headline: topBrief
        ? clamp(topBrief.headline, 56)
        : clamp(`${weather.conditions} Across the Cornwall Hills`, 56),
      deck: clamp(weather.todaySummary, 95),
      body: clamp(
        topBrief ? `${topBrief.detail} ${weather.tonightSummary}` : almanacPhenology,
        220,
      ),
    },
    weatherCallout: {
      summaryLine: clamp(weather.todaySummary, 68),
      lookaheadLine: clamp(weather.tomorrowSummary || weather.tonightSummary, 68),
    },
    dispatches,
    upcomingEvents: events,
    seasonalSpotlight: {
      windowId: winningWindow.id,
      kicker: clamp(winningWindow.label.toUpperCase(), 22),
      headline: clamp(winningWindow.label, 38),
      metric:
        winningWindow.id === 'housatonic_river' && river.dischargeCfs
          ? `${river.dischargeCfs} CFS`
          : `${weather.highF}° / ${weather.lowF}°`,
      body: clamp(winningWindow.factualContext, 110),
    },
    almanacFeature: {
      title: clamp(topLore?.title ?? 'Field & Trail Notes', 34),
      note: clamp(topLore?.snippet ?? almanacPhenology, 150),
    },
  };
}

// Warm-instance cache (30 min) for synthesized content; active poster rotates every 15m!
const editionCache = new Map<
  string,
  { expiresAt: number; leadArchetype: ArchetypeId; edition: Edition }
>();

export async function buildStorefrontEdition(options?: {
  now?: Date;
  archetypeOverride?: string | null;
  daypartOverride?: string | null;
  requestOrigin?: string;
  forceRefresh?: boolean;
}): Promise<Edition> {
  const now = options?.now ?? new Date();
  const clock = getCornwallClock(now);
  const daypart = computeDaypart(clock, options?.daypartOverride);

  const validArchOverride: ArchetypeId | null =
    options?.archetypeOverride &&
    ['broadsheet', 'handbill', 'almanac', 'dispatch', 'poster'].includes(
      options.archetypeOverride,
    )
      ? (options.archetypeOverride as ArchetypeId)
      : null;

  const cacheKey = `${clock.dateIso}:${daypart}`;
  const cached = editionCache.get(cacheKey);
  if (!options?.forceRefresh && cached && cached.expiresAt > Date.now()) {
    const rotatingArch = selectRotatingArchetype(
      clock,
      cached.leadArchetype,
      Boolean(cached.edition.alertBanner),
    );
    return {
      ...cached.edition,
      archetype: validArchOverride ?? rotatingArch,
    };
  }

  const almanac = buildAlmanacData(now, daypart);

  // Step 1: Parallel data gathering across NWS, USGS, Cornwall Chronicle (24h cached), and Parallel Live Web
  const [weather, river, chronicle, liveEvidence] = await Promise.all([
    fetchCornwallWeather(),
    fetchHousatonicRiver(),
    getChronicleDigest(options?.requestOrigin),
    gatherLiveLocalEvidence(clock),
  ]);

  // Step 2: Hard Calendar Seasonal Windows in TypeScript (ADR 0003)
  const eligibleWindows = getEligibleSeasonalWindows(clock, weather, river);
  const upcomingChronicleEvents = filterUpcomingChronicleEvents(
    chronicle?.events ?? [],
    clock.dateIso,
  );

  // Step 3: Route Archetype + Seasonal Spotlight + Live Status Checks via Decisions API
  const routing = await routeEditionWithDecisions({
    clock,
    daypart,
    weather,
    river,
    eligibleWindows,
    chronicle: chronicle
      ? { ...chronicle, events: upcomingChronicleEvents }
      : null,
    liveEvidence,
    archetypeOverride: validArchOverride,
  });

  const winningWindow =
    eligibleWindows.find((w) => w.id === routing.spotlightId) ?? eligibleWindows[0];

  const fallbackCopy = buildFallbackEditionCopy({
    todayIso: clock.dateIso,
    weather,
    river,
    almanacPhenology: almanac.phenologyNote,
    chronicle,
    upcomingChronicleEvents,
    winningWindow,
    hasUrgentBanner: routing.hasUrgentBanner,
  });

  // Step 4: Single structured Gemini pass to craft authentic storefront broadsheet copy
  const geminiKey = process.env.GEMINI_API_KEY;
  let synthesized = fallbackCopy;

  if (geminiKey) {
    try {
      const client = new GoogleGenAI({ apiKey: geminiKey });
      const contextPayload = {
        todayDate: almanac.fullDateLabel,
        todayIso: clock.dateIso,
        daypart,
        editionTitle: editionTitleForDaypart(daypart, clock),
        chosenArchetype: routing.archetype,
        hasUrgentBanner: routing.hasUrgentBanner,
        isMohawkSkiOpen: routing.isMohawkSkiOpen,
        hasSchoolDisruption: routing.hasSchoolDisruption,
        winningSeasonalWindow: winningWindow,
        weather: {
          currentTempF: weather.currentTempF,
          conditions: weather.conditions,
          wind: weather.wind,
          highF: weather.highF,
          lowF: weather.lowF,
          todaySummary: weather.todaySummary,
          tonightSummary: weather.tonightSummary,
          tomorrowSummary: weather.tomorrowSummary,
          alerts: weather.alerts,
        },
        housatonicRiver: river,
        almanac: {
          sunrise: almanac.sunrise,
          sunset: almanac.sunset,
          dayLength: almanac.dayLengthLabel,
          daylightDelta: almanac.daylightDeltaLabel,
          moonPhase: almanac.moonPhaseName,
          phenologyNote: almanac.phenologyNote,
        },
        chronicleIssue: chronicle?.issueLabel ?? null,
        upcomingChronicleEvents: upcomingChronicleEvents.slice(0, 10),
        chronicleBriefs: chronicle?.briefs ?? [],
        chronicleNatureAndLore: chronicle?.natureAndLore ?? [],
        liveLocalWebDispatches: [...liveEvidence, ...routing.citations].slice(0, 8),
      };

      const editorialPrompt = `You are the editor of THE CORNWALL DISPATCH, a witty, warm, literary black-and-white storefront broadsheet displayed publicly at a shop counter in Cornwall, Connecticut (Litchfield Hills).

EDITORIAL RULES:
1. VOICE: Write like a sharp New England village newspaper & Old Farmer's Almanac — specific local place names (West Cornwall, Cornwall Bridge, Pine Street, Cream Hill, Housatonic, CCS, Cornwall Library), crisp verbs, zero AI clichés, zero exclamation-mark hype.
2. STOREFRONT BOUNDARY: Never include national partisan politics, gruesome crime, or private household-chore commands (never say "cover your plants" or "plan school logistics"). Speak to neighbors, hikers, anglers, and visitors standing at the store counter.
3. DAYPART FOCUS (${daypart.toUpperCase()}):
   - morning: Lead with today's Cornwall sky, town pulse, and what's ahead today.
   - midday: Spotlight an intriguing Cornwall Chronicle brief, local curiosity, or afternoon/evening program.
   - evening: Pivot toward tonight's chill/weather, tomorrow's outlook, and upcoming community gatherings.
   - weekend: Highlight weekend outings, trails, Housatonic River / Mohawk conditions, fairs, talks, and markets.
4. STRICT SEASONAL TRUTH: Your Seasonal Spotlight MUST strictly describe winningSeasonalWindow (${winningWindow.id}: ${winningWindow.label}). NEVER mention maple sap/sugaring unless winningSeasonalWindow.id is "maple_sap". If winningSeasonalWindow.id is "mohawk_ski" and isMohawkSkiOpen is false, frame it as early-winter snowmaking/pre-season mountain watch rather than claiming trails are open.
5. CHRONOLOGICAL ACCURACY: Only list upcoming events on or after ${clock.dateIso}. Format whenLabel cleanly (e.g. TODAY, FRI NOV 20, SAT NOV 28, SUN DEC 20).

SOURCE CONTEXT JSON:
${JSON.stringify(contextPayload, null, 2)}`;

      const interaction = await client.interactions.create({
        model: 'gemini-4-hydrogen',
        store: false,
        input: editorialPrompt,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: EDITION_COPY_SCHEMA,
        },
      });

      if (interaction.output_text) {
        const raw = JSON.parse(interaction.output_text);
        const bannerRaw = clamp(raw.alertBanner, 54);
        synthesized = {
          alertBanner: routing.hasUrgentBanner && bannerRaw ? bannerRaw : null,
          leadStory: {
            kicker: clamp(
              raw.leadStory?.kicker,
              20,
              fallbackCopy.leadStory.kicker,
            ).toUpperCase(),
            headline: clamp(
              raw.leadStory?.headline,
              46,
              fallbackCopy.leadStory.headline,
            ),
            deck: clamp(raw.leadStory?.deck, 92, fallbackCopy.leadStory.deck),
            body: clamp(raw.leadStory?.body, 115, fallbackCopy.leadStory.body),
          },
          weatherCallout: {
            summaryLine: clamp(
              raw.weatherCallout?.summaryLine,
              56,
              fallbackCopy.weatherCallout.summaryLine,
            ),
            lookaheadLine: clamp(
              raw.weatherCallout?.lookaheadLine,
              58,
              fallbackCopy.weatherCallout.lookaheadLine,
            ),
          },
          dispatches: (Array.isArray(raw.dispatches) ? raw.dispatches : [])
            .slice(0, 3)
            .map((d: any, idx: number) => ({
              kicker: clamp(
                d?.kicker,
                16,
                fallbackCopy.dispatches[idx]?.kicker ?? 'CORNWALL',
              ).toUpperCase(),
              headline: clamp(
                d?.headline,
                40,
                fallbackCopy.dispatches[idx]?.headline ?? 'Local Note',
              ),
              body: clamp(d?.body, 82, fallbackCopy.dispatches[idx]?.body ?? ''),
            })),
          upcomingEvents: (Array.isArray(raw.upcomingEvents) ? raw.upcomingEvents : [])
            .slice(0, 4)
            .map((e: any, idx: number) => ({
              whenLabel: clamp(
                e?.whenLabel,
                13,
                fallbackCopy.upcomingEvents[idx]?.whenLabel ?? 'UPCOMING',
              ).toUpperCase(),
              title: clamp(
                e?.title,
                34,
                fallbackCopy.upcomingEvents[idx]?.title ?? 'Town Event',
              ),
              whereAndTime: clamp(
                e?.whereAndTime,
                32,
                fallbackCopy.upcomingEvents[idx]?.whereAndTime ?? 'Cornwall',
              ),
            })),
          seasonalSpotlight: {
            windowId: winningWindow.id as SeasonalWindowId,
            kicker: clamp(
              raw.seasonalSpotlight?.kicker,
              18,
              fallbackCopy.seasonalSpotlight.kicker,
            ).toUpperCase(),
            headline: clamp(
              raw.seasonalSpotlight?.headline,
              34,
              fallbackCopy.seasonalSpotlight.headline,
            ),
            metric: clamp(
              raw.seasonalSpotlight?.metric,
              13,
              fallbackCopy.seasonalSpotlight.metric,
            ),
            body: clamp(
              raw.seasonalSpotlight?.body,
              90,
              fallbackCopy.seasonalSpotlight.body,
            ),
          },
          almanacFeature: {
            title: clamp(
              raw.almanacFeature?.title,
              30,
              fallbackCopy.almanacFeature.title,
            ),
            note: clamp(
              raw.almanacFeature?.note,
              102,
              fallbackCopy.almanacFeature.note,
            ),
          },
        };

        if (synthesized.dispatches.length < 3) {
          synthesized.dispatches = fallbackCopy.dispatches;
        }
        if (synthesized.upcomingEvents.length < 4) {
          synthesized.upcomingEvents = fallbackCopy.upcomingEvents;
        }
      }
    } catch (err) {
      console.error('[synthesize] Gemini copy synthesis failed, using fallback:', err);
    }
  }

  const activeRotatingArch = selectRotatingArchetype(
    clock,
    routing.archetype,
    Boolean(synthesized.alertBanner),
  );

  const built: Edition = {
    generatedAt: now.toISOString(),
    dateLabel: `${almanac.weekdayShort}, ${almanac.monthDayLabel}`,
    editionLabel: editionTitleForDaypart(daypart, clock),
    volumeLabel: 'CORNWALL VILLAGE • WEST CORNWALL • CORNWALL BRIDGE',
    daypart,
    archetype: validArchOverride ?? activeRotatingArch,
    ...synthesized,
    weather,
    river,
    almanac,
    routingMeta: {
      decisionProvider: routing.provider,
      chronicleIssue: chronicle?.issueLabel ?? 'LIVE FEED',
    },
  };

  if (!options?.now) {
    editionCache.set(cacheKey, {
      expiresAt: Date.now() + 30 * 60 * 1000,
      leadArchetype: routing.archetype,
      edition: built,
    });
  }

  return built;
}
