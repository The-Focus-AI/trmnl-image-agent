import { describe, expect, it } from 'vitest';
import {
  computeDaypart,
  filterSeasonalWindowIds,
  getEligibleSeasonalWindows,
  isWithinDateSpan,
  selectRotatingArchetype,
} from '../seasonal.js';
import { buildAlmanacData } from '../sources/almanac.js';
import { filterUpcomingChronicleEvents } from '../synthesize.js';
import type { ChronicleEvent } from '../types.js';

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
