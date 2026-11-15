import type {
  ArchetypeId,
  Daypart,
  EligibleSeasonalCandidate,
  RiverData,
  SeasonalWindowId,
  WeatherData,
} from './types.js';

export const CORNWALL_TZ = 'America/New_York';

export interface LocalClock {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  weekday: number; // 0=Sun..6=Sat
  dateIso: string; // YYYY-MM-DD
}

export function getCornwallClock(now: Date = new Date()): LocalClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CORNWALL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const rawHour = Number(get('hour'));
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(get('minute'));
  const wk = get('weekday');
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[wk] ?? 0;
  const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { year, month, day, hour, minute, weekday, dateIso };
}

export function computeDaypart(clock: LocalClock, override?: string | null): Daypart {
  if (
    override === 'morning' ||
    override === 'midday' ||
    override === 'evening' ||
    override === 'weekend'
  ) {
    return override;
  }

  const isWeekend = clock.weekday === 0 || clock.weekday === 6;
  if (clock.hour >= 5 && clock.hour < 11) {
    return 'morning';
  }
  if (clock.hour >= 11 && clock.hour < 16) {
    return isWeekend ? 'weekend' : 'midday';
  }
  if (isWeekend && clock.hour < 18) {
    return 'weekend';
  }
  return 'evening';
}

export function editionTitleForDaypart(daypart: Daypart, clock: LocalClock): string {
  const isWeekend = clock.weekday === 0 || clock.weekday === 6;
  switch (daypart) {
    case 'morning':
      return isWeekend ? 'WEEKEND MORNING EDITION' : 'MORNING EDITION';
    case 'midday':
      return 'MIDDAY STOREFRONT EDITION';
    case 'weekend':
      return 'WEEKEND DISPATCH';
    case 'evening':
      return 'EVENING & TOMORROW EDITION';
  }
}

export function defaultArchetypeForDaypart(
  daypart: Daypart,
  clock: LocalClock,
  hasWeatherAlert: boolean,
): ArchetypeId {
  if (hasWeatherAlert) return 'poster';
  switch (daypart) {
    case 'morning':
      return 'dispatch'; // Lead morning hour with Sky & River, then rotate Town -> Events -> Almanac
    case 'midday':
      return 'broadsheet'; // Lead midday with Town Bulletin
    case 'weekend':
      return 'handbill'; // Lead weekend with Coming Up Events / Outings
    case 'evening':
      return 'almanac'; // Lead evening with Almanac, Moon & Tomorrow
  }
}

/**
 * Computes which single-focus poster card to display in the current 15-minute TRMNL refresh slot.
 * Slot 0 of each hour shows the Decisions-selected leadArchetype, and slots 1..3 cycle cleanly
 * through the remaining single-focus posters so all Cornwall feeds get room-readable 18-64px type.
 */
export function selectRotatingArchetype(
  clock: Pick<LocalClock, 'hour' | 'minute'>,
  leadArchetype: ArchetypeId,
  hasUrgentBanner: boolean,
): ArchetypeId {
  const slot = Math.floor((clock.hour * 60 + clock.minute) / 15);

  if (hasUrgentBanner || leadArchetype === 'poster') {
    const alertDeck: ArchetypeId[] = ['poster', 'dispatch', 'poster', 'broadsheet'];
    return alertDeck[slot % alertDeck.length];
  }

  const baseOrder: ArchetypeId[] = ['dispatch', 'broadsheet', 'handbill', 'almanac'];
  const rotatedDeck: ArchetypeId[] = [
    leadArchetype,
    ...baseOrder.filter((id) => id !== leadArchetype),
  ];

  return rotatedDeck[slot % rotatedDeck.length];
}

/**
 * Helper to check if (month, day) falls inside an inclusive calendar span.
 * Supports spans wrapping across New Year (e.g. Nov 20 -> Apr 15).
 */
export function isWithinDateSpan(
  month: number,
  day: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): boolean {
  const mmdd = month * 100 + day;
  const start = startMonth * 100 + startDay;
  const end = endMonth * 100 + endDay;

  if (start <= end) {
    return mmdd >= start && mmdd <= end;
  }
  return mmdd >= start || mmdd <= end;
}

export function isMohawkWindowOpen(clock: Pick<LocalClock, 'month' | 'day'>): boolean {
  return isWithinDateSpan(clock.month, clock.day, 11, 20, 4, 15);
}

/**
 * Enforces ADR 0003: Hard calendar Seasonal Windows in TypeScript BEFORE any LLM/Decision call.
 * Out-of-window modules are structurally excluded so November freeze-thaw days can never
 * hallucinate "Maple Sap Running" and winter days never show outdoor Farmers Markets.
 */
export function getEligibleSeasonalWindows(
  clock: Pick<LocalClock, 'month' | 'day' | 'weekday'>,
  weather: Pick<WeatherData, 'highF' | 'lowF' | 'conditions'>,
  river: Pick<RiverData, 'dischargeCfs' | 'statusLabel'>,
): EligibleSeasonalCandidate[] {
  const { month, day } = clock;
  const eligible: EligibleSeasonalCandidate[] = [];

  // 1. Maple Sugaring: STRICTLY Feb 1 – Apr 10 AND freeze-thaw temperatures
  if (
    isWithinDateSpan(month, day, 2, 1, 4, 10) &&
    weather.highF > 32 &&
    weather.lowF < 32
  ) {
    const ideal =
      weather.highF >= 38 &&
      weather.highF <= 50 &&
      weather.lowF >= 18 &&
      weather.lowF <= 29;
    eligible.push({
      id: 'maple_sap',
      label: 'Maple Sugaring Run',
      windowRule: 'Feb 1 – Apr 10 with freeze/thaw',
      factualContext: `Freeze-thaw sap run (${ideal ? 'ideal' : 'active'}): High ${weather.highF}°F / Low ${weather.lowF}°F in Cornwall sugarbushes.`,
    });
  }

  // 2. Mohawk Mountain Ski Window: STRICTLY Nov 20 – Apr 15
  if (isMohawkWindowOpen(clock)) {
    eligible.push({
      id: 'mohawk_ski',
      label: 'Mohawk Mountain Snow & Trail Watch',
      windowRule: 'Nov 20 – Apr 15',
      factualContext: `Mohawk Mountain ski/snowmaking season window is open (High ${weather.highF}°F / Low ${weather.lowF}°F). Verify live trail/snowmaking status.`,
    });
  }

  // 3. Housatonic River Conditions: Apr 1 – Nov 20 (when live gauge data is present)
  if (isWithinDateSpan(month, day, 4, 1, 11, 20) && river.dischargeCfs !== null) {
    eligible.push({
      id: 'housatonic_river',
      label: 'Housatonic River Flow',
      windowRule: 'Apr 1 – Nov 20',
      factualContext: `Housatonic River at Falls Village / Covered Bridge running at ${river.dischargeCfs} CFS (${river.statusLabel}).`,
    });
  }

  // 4. Outdoor Cornwall Farmers Markets: STRICTLY May 1 – Oct 31
  if (isWithinDateSpan(month, day, 5, 1, 10, 31)) {
    eligible.push({
      id: 'farmers_market',
      label: 'Cornwall Farmers Markets',
      windowRule: 'May 1 – Oct 31',
      factualContext:
        'Outdoor market season active: Saturday mornings on Pine Street (Cornwall Co-op) and West Cornwall Wish House lawn.',
    });
  }

  // 5. Frost Watch: Shoulder growing windows ONLY (Apr 15–May 31 and Sep 15–Oct 25) when low <= 36°F
  const inFrostShoulder =
    isWithinDateSpan(month, day, 4, 15, 5, 31) ||
    isWithinDateSpan(month, day, 9, 15, 10, 25);
  if (inFrostShoulder && weather.lowF <= 36) {
    const kind =
      weather.lowF <= 28
        ? 'Hard freeze'
        : weather.lowF <= 32
          ? 'Killing frost'
          : 'Light valley frost';
    eligible.push({
      id: 'frost_watch',
      label: 'Northwest Corner Frost Watch',
      windowRule: 'Apr 15–May 31 & Sep 15–Oct 25 (Low <= 36°F)',
      factualContext: `${kind} expected in Cornwall hollows tonight with overnight low near ${weather.lowF}°F.`,
    });
  }

  // 6. Spring Garden & Green-Up Almanac: Mar 15 – Jun 20
  if (isWithinDateSpan(month, day, 3, 15, 6, 20)) {
    eligible.push({
      id: 'spring_garden',
      label: 'Zone 6a Spring Field & Garden',
      windowRule: 'Mar 15 – Jun 20',
      factualContext: `Litchfield Hills Zone 6a spring growing window (High ${weather.highF}°F / Low ${weather.lowF}°F).`,
    });
  }

  // 7. High Summer & Harvest: Jun 21 – Sep 30
  if (isWithinDateSpan(month, day, 6, 21, 9, 30)) {
    eligible.push({
      id: 'summer_harvest',
      label: 'Cornwall Summer & Harvest',
      windowRule: 'Jun 21 – Sep 30',
      factualContext: `Local farmstand, meadow, and harvest season across Cornwall (High ${weather.highF}°F).`,
    });
  }

  // 8. Autumn Foliage: Sep 25 – Nov 5
  if (isWithinDateSpan(month, day, 9, 25, 11, 5)) {
    eligible.push({
      id: 'autumn_foliage',
      label: 'Litchfield Hills Foliage',
      windowRule: 'Sep 25 – Nov 5',
      factualContext:
        'Hardwood canopy turning across Mohawk Ridge, Cream Hill, and Route 7.',
    });
  }

  // 9. Late-Autumn & Winter Woods / Hearth Season: Nov 6 – Mar 14
  if (isWithinDateSpan(month, day, 11, 6, 3, 14)) {
    eligible.push({
      id: 'winter_hearth',
      label: 'Late-Autumn & Winter Woods',
      windowRule: 'Nov 6 – Mar 14',
      factualContext: `Stick-season & winter hearth weather in the hills (High ${weather.highF}°F / Low ${weather.lowF}°F) — bare stone-wall ridgelines, woodstoves, and crisp trail mornings.`,
    });
  }

  // Guarantee at least one candidate is always present
  if (eligible.length === 0) {
    eligible.push({
      id: 'housatonic_river',
      label: 'Housatonic Valley Conditions',
      windowRule: 'Year-round fallback',
      factualContext: `Today in Cornwall: High ${weather.highF}°F, Low ${weather.lowF}°F, ${weather.conditions}.`,
    });
  }

  return eligible;
}

export function filterSeasonalWindowIds(
  candidates: EligibleSeasonalCandidate[],
): SeasonalWindowId[] {
  return candidates.map((c) => c.id);
}
