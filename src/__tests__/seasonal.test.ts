import { describe, expect, it } from 'vitest';
import { renderEditionHtml } from '../render/archetypes.js';
import {
  computeDaypart,
  filterSeasonalWindowIds,
  getEligibleSeasonalWindows,
  isWithinDateSpan,
  selectRotatingArchetype,
} from '../seasonal.js';
import { buildAlmanacData } from '../sources/almanac.js';
import {
  ensureVisibleYearAttribution,
  filterCurrentChronicleBriefs,
  filterUpcomingChronicleEvents,
} from '../synthesize.js';
import type { ChronicleBrief, ChronicleEvent } from '../types.js';

describe('Calendar-gated Seasonal Windows (ADR 0003)', () => {
  it('NEVER allows maple_sap on Nov 15 even during ideal freeze-thaw temps', () => {
    const candidates = getEligibleSeasonalWindows(
      { month: 11, day: 15, weekday: 0 },
      { highF: 44, lowF: 26, conditions: 'Sunny' },
      { dischargeCfs: 640, statusLabel: 'IDEAL WADING' },
    );
    const ids = filterSeasonalWindowIds(candidates);
    expect(ids).not.toContain('maple_sap');
    expect(ids).not.toContain('farmers_market');
    expect(ids).toContain('housatonic_river');
    expect(ids).toContain('winter_hearth');
  });

  it('DOES allow maple_sap during late-February freeze-thaw temps', () => {
    const candidates = getEligibleSeasonalWindows(
      { month: 2, day: 24, weekday: 2 },
      { highF: 43, lowF: 23, conditions: 'Mostly Sunny' },
      { dischargeCfs: 980, statusLabel: 'MODERATE FLOW' },
    );
    const ids = filterSeasonalWindowIds(candidates);
    expect(ids).toContain('maple_sap');
    expect(ids).toContain('mohawk_ski');
  });

  it('gates mohawk_ski strictly to Nov 20 – Apr 15 and farmers_market to May 1 – Oct 31', () => {
    const mayCandidates = getEligibleSeasonalWindows(
      { month: 5, day: 16, weekday: 6 },
      { highF: 68, lowF: 45, conditions: 'Partly Sunny' },
      { dischargeCfs: 720, statusLabel: 'IDEAL WADING' },
    );
    const mayIds = filterSeasonalWindowIds(mayCandidates);
    expect(mayIds).toContain('farmers_market');
    expect(mayIds).toContain('spring_garden');
    expect(mayIds).toContain('housatonic_river');
    expect(mayIds).not.toContain('mohawk_ski');
    expect(mayIds).not.toContain('maple_sap');
  });

  it('triggers frost_watch only in spring/fall shoulder windows when lowF <= 36', () => {
    const octFrost = getEligibleSeasonalWindows(
      { month: 10, day: 8, weekday: 4 },
      { highF: 56, lowF: 33, conditions: 'Clear' },
      { dischargeCfs: 420, statusLabel: 'IDEAL WADING' },
    );
    expect(filterSeasonalWindowIds(octFrost)).toContain('frost_watch');

    const janFreeze = getEligibleSeasonalWindows(
      { month: 1, day: 15, weekday: 4 },
      { highF: 29, lowF: 12, conditions: 'Clear' },
      { dischargeCfs: 550, statusLabel: 'STEADY' },
    );
    expect(filterSeasonalWindowIds(janFreeze)).not.toContain('frost_watch');
  });

  it('handles wrapping date spans across New Year accurately', () => {
    expect(isWithinDateSpan(11, 20, 11, 20, 4, 15)).toBe(true);
    expect(isWithinDateSpan(1, 10, 11, 20, 4, 15)).toBe(true);
    expect(isWithinDateSpan(4, 15, 11, 20, 4, 15)).toBe(true);
    expect(isWithinDateSpan(11, 15, 11, 20, 4, 15)).toBe(false);
    expect(isWithinDateSpan(7, 4, 11, 20, 4, 15)).toBe(false);
  });
});

describe('Daypart & Chronological Event Filtering', () => {
  it('computes weekday vs weekend dayparts accurately', () => {
    expect(
      computeDaypart({
        year: 2026,
        month: 11,
        day: 16,
        hour: 8,
        minute: 15,
        weekday: 1,
        dateIso: '2026-11-16',
      }),
    ).toBe('morning');
    expect(
      computeDaypart({
        year: 2026,
        month: 11,
        day: 16,
        hour: 13,
        minute: 0,
        weekday: 1,
        dateIso: '2026-11-16',
      }),
    ).toBe('midday');
    expect(
      computeDaypart({
        year: 2026,
        month: 11,
        day: 15,
        hour: 13,
        minute: 0,
        weekday: 0,
        dateIso: '2026-11-15',
      }),
    ).toBe('weekend');
    expect(
      computeDaypart({
        year: 2026,
        month: 11,
        day: 16,
        hour: 19,
        minute: 30,
        weekday: 1,
        dateIso: '2026-11-16',
      }),
    ).toBe('evening');
  });

  it('drops past ISO dates and sorts upcoming events chronologically', () => {
    const sample: ChronicleEvent[] = [
      {
        date: '2026-11-07',
        time: '5 PM',
        title: 'Past Gallery Reception',
        location: 'Library',
        summary: 'Already happened',
        isMajor: false,
      },
      {
        date: '2026-11-28',
        time: '10 AM',
        title: 'Holiday Fair',
        location: 'UCC',
        summary: 'Annual fair',
        isMajor: true,
      },
      {
        date: '2026-11-15',
        time: '4 PM',
        title: 'Today Book Talk',
        location: 'Cornwall Library',
        summary: 'Happening today',
        isMajor: true,
      },
      {
        date: 'EVERY THU',
        time: '10:30 AM',
        title: 'Story Hour',
        location: 'Cornwall Library',
        summary: 'Weekly',
        isMajor: false,
      },
    ];

    const filtered = filterUpcomingChronicleEvents(sample, '2026-11-15');
    expect(filtered.map((e) => e.title)).toEqual([
      'Today Book Talk',
      'Holiday Fair',
      'Story Hour',
    ]);
  });
});

describe('Cornwall Astronomical Almanac Math', () => {
  it('computes losing daylight in mid-November and valid lunar phase bounds', () => {
    const alm = buildAlmanacData(new Date('2026-11-15T13:00:00Z'), 'morning');
    expect(alm.dateIso).toBe('2026-11-15');
    expect(alm.daylightDeltaLabel.startsWith('−')).toBe(true);
    expect(alm.moonPhaseFraction).toBeGreaterThanOrEqual(0);
    expect(alm.moonPhaseFraction).toBeLessThan(1);
    expect(alm.sunrise).toMatch(/AM$/);
    expect(alm.sunset).toMatch(/PM$/);
  });

  it('rotates through all 4 single-focus poster cards across 15-minute slots', () => {
    const seen = [0, 15, 30, 45].map((minute) =>
      selectRotatingArchetype({ hour: 9, minute }, 'dispatch', false),
    );
    expect(new Set(seen).size).toBe(4);
    expect(seen[0]).toBe('dispatch');
  });
});

describe('Temporal Brief Filtering & Broadsheet Visible-Year Attribution', () => {
  it('filters out expired dated hearing notices and ranks current briefs ahead of retrospectives', () => {
    const briefs: ChronicleBrief[] = [
      {
        headline: 'P&Z Hearing Continues Nov 10',
        detail: 'Special permit hearing continues Nov 10 on Zoom.',
        eventDate: '2026-11-10',
        isRetrospective: false,
      },
      {
        headline: 'Cornwall Recorded 90.46% Turnout in 2024',
        detail: 'Looking back at the 2024 Democracy Cup small-town award.',
        eventDate: '',
        isRetrospective: true,
      },
      {
        headline: 'Town Pays Off School & Garage Bonds Early',
        detail: 'Board of Finance retires final $1.55M bond issue ahead of schedule.',
        eventDate: '',
        isRetrospective: false,
      },
      {
        headline: 'Town Meeting Set for Nov 20',
        detail: 'Voters convene at Town Hall Friday evening.',
        eventDate: '2026-11-20',
        isRetrospective: false,
      },
    ];

    const filtered = filterCurrentChronicleBriefs(briefs, '2026-11-15');
    expect(filtered.map((b) => b.headline)).toEqual([
      'Town Pays Off School & Garage Bonds Early',
      'Town Meeting Set for Nov 20',
      'Cornwall Recorded 90.46% Turnout in 2024',
    ]);
  });

  it('surfaces prior-year context (e.g. 2024) onto Broadsheet headline + deck when tucked inside hidden body', () => {
    const rawLead = {
      kicker: 'CIVIC PRIDE',
      headline: 'Cornwall Tops State in Voter Turnout',
      deck: 'Democracy Cup honors 90.46% turnout, highest among CT small towns.',
      body: "Cornwall won the Democracy Cup in the small-town category for 90.46% voter turnout in the 2024 election, highest among Connecticut's small towns. Tonight: Partly Cloudy, low around 33°F.",
    };

    const attributed = ensureVisibleYearAttribution(rawLead, 2026);
    expect(attributed.headline).toBe('Cornwall Tops State in Voter Turnout (2024)');
    expect(attributed.deck).toContain('In 2024:');
    expect(attributed.deck).toContain('90.46% turnout');

    // Verify the rendered Broadsheet poster HTML visibly displays "2024" even though leadStory.body is not rendered on Broadsheet
    const alm = buildAlmanacData(new Date('2026-11-15T18:00:00Z'), 'weekend');
    const html = renderEditionHtml({
      generatedAt: '2026-11-15T18:00:00Z',
      dateLabel: 'SUN, NOV 15',
      editionLabel: 'SUNDAY DISPATCH',
      volumeLabel: 'CORNWALL VILLAGE • WEST CORNWALL • CORNWALL BRIDGE',
      daypart: 'weekend',
      archetype: 'broadsheet',
      alertBanner: null,
      leadStory: attributed,
      weatherCallout: { summaryLine: 'Partly sunny', lookaheadLine: 'Low 33°F' },
      dispatches: [
        { kicker: 'TOWN', headline: 'Bonds Paid Early', body: 'Town debt retired.' },
        { kicker: 'LIBRARY', headline: 'New Director Named', body: 'Cara Johnson appointed.' },
        { kicker: 'RIVER', headline: '640 CFS', body: 'Clear wading.' },
      ],
      upcomingEvents: [
        { whenLabel: 'FRI NOV 20', title: 'Town Meeting', whereAndTime: 'Town Hall • 7:30 PM' },
      ],
      seasonalSpotlight: {
        windowId: 'frost_watch',
        kicker: 'FROST WATCH',
        headline: '33° Valley Chill',
        metric: '45° / 33°',
        body: 'Frost in hollows.',
      },
      almanacFeature: {
        whenLabel: 'FRI NOV 20',
        title: 'Town Meeting',
        note: 'Town Hall • 7:30 PM',
      },
      weather: {
        fetchedAt: '2026-11-15T18:00:00Z',
        currentTempF: 43,
        conditions: 'Partly Sunny',
        wind: 'NW 8 mph',
        highF: 45,
        lowF: 33,
        todayPrecipPct: 0,
        tonightPrecipPct: 0,
        todaySummary: 'Partly sunny',
        tonightSummary: 'Partly cloudy, low 33',
        tomorrowSummary: 'Sunny',
        hourly: [],
        periods: [],
        alerts: [],
      },
      river: {
        siteName: 'Housatonic River',
        siteCode: '01199000',
        dischargeCfs: 640,
        gageHeightFt: 2.8,
        waterTempF: 44,
        statusLabel: 'IDEAL WADING',
        anglerNote: 'Clear pocket water.',
        observedAt: '2026-11-15T18:00:00Z',
      },
      almanac: alm,
      routingMeta: { decisionProvider: 'parallel', chronicleIssue: 'NOVEMBER 2026' },
    });

    expect(html).toContain('Cornwall Tops State in Voter Turnout (2024)');
    expect(html).toContain('In 2024: Democracy Cup honors 90.46% turnout');
    // Confirm Broadsheet really omits leadStory.body (which is why visible attribution is required)
    expect(html).not.toContain('Tonight: Partly Cloudy, low around 33°F.');
  });

  it('leaves leadStory untouched when headline or deck already names a year or body has no past year', () => {
    const alreadyClear = {
      kicker: 'CIVIC NOTE',
      headline: '2024 Turnout Remembered Ahead of Vote',
      deck: 'Lyme defends the 2025 Democracy Cup as small towns tally ballots.',
      body: 'Cornwall posted 90.46% turnout in 2024.',
    };
    expect(ensureVisibleYearAttribution(alreadyClear, 2026)).toEqual(alreadyClear);
  });
});
