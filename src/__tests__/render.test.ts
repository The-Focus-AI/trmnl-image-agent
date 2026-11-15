import { describe, expect, it } from 'vitest';
import { renderEditionHtml } from '../render/archetypes.js';
import type { ArchetypeId, Edition } from '../types.js';

function makeFixtureEdition(archetype: ArchetypeId): Edition {
  return {
    generatedAt: '2026-11-15T12:30:00.000Z',
    dateLabel: 'SUN, NOV 15',
    editionLabel: 'WEEKEND MORNING EDITION',
    volumeLabel: 'CORNWALL VILLAGE • WEST CORNWALL • CORNWALL BRIDGE',
    daypart: 'morning',
    archetype,
    alertBanner: null,
    leadStory: {
      kicker: 'AROUND CORNWALL',
      headline: 'Town Launches New CornwallCT.gov Civic Portal',
      deck: 'Fresh municipal calendar & boards live as crisp November sun clears Mohawk Ridge.',
      body: 'Cornwall residents have a cleaner digital front door at cornwallct.gov while stone walls along Cream Hill catch bright late-autumn light.',
    },
    weatherCallout: {
      summaryLine: 'Bright Litchfield Hills sun with a brisk northwest breeze.',
      lookaheadLine: 'Clear & frosty tonight near 27°; sunny Monday near 46°.',
    },
    dispatches: [
      {
        kicker: 'LIBRARY',
        headline: 'Author Talk & Cider at 4 PM',
        body: 'Neighbors gather on Pine Street this afternoon for local history & warm cider.',
      },
      {
        kicker: 'COVERED BRIDGE',
        headline: 'Housatonic Running Clear & Steady',
        body: 'Late-autumn trout water holds at 640 CFS beneath West Cornwall bridge.',
      },
      {
        kicker: 'SAVE THE DATE',
        headline: 'UCC Holiday Fair Set for Nov 28',
        body: 'Handcrafts, wreaths, and soup lunch return Thanksgiving Saturday.',
      },
    ],
    upcomingEvents: [
      {
        whenLabel: 'TODAY',
        title: 'Sunday Author Talk & Cider',
        whereAndTime: 'Cornwall Library • 4 PM',
      },
      {
        whenLabel: 'FRI NOV 20',
        title: 'Community Potluck Supper',
        whereAndTime: 'Town Hall • 6 PM',
      },
      {
        whenLabel: 'SAT NOV 28',
        title: 'Holiday Artisans Fair',
        whereAndTime: 'UCC Parish House • 10 AM',
      },
      {
        whenLabel: 'SAT DEC 5',
        title: 'Cornwall Reads Cornwall',
        whereAndTime: 'Library • 5 PM',
      },
    ],
    seasonalSpotlight: {
      windowId: 'winter_hearth',
      kicker: 'STICK SEASON',
      headline: 'Late-Autumn Woods & Stone Walls',
      metric: '45° / 27°',
      body: 'Bare hardwood ridges open long views across the Housatonic valley.',
    },
    almanacFeature: {
      title: 'November Beavers & Ice Rims',
      note: 'Thin skim ice forms in sheltered Cream Hill coves before melting by mid-morning.',
    },
    weather: {
      fetchedAt: '2026-11-15T12:30:00.000Z',
      currentTempF: 42,
      conditions: 'Mostly Sunny',
      wind: 'NW 9 mph',
      highF: 45,
      lowF: 27,
      todayPrecipPct: 10,
      tonightPrecipPct: 5,
      todaySummary: 'Mostly sunny, with a high near 45.',
      tonightSummary: 'Mostly clear, with a low around 27.',
      tomorrowSummary: 'Sunny, with a high near 46.',
      hourly: Array.from({ length: 12 }, (_, idx) => ({
        hourLabel: `${((8 + idx - 1) % 12) + 1}${8 + idx >= 12 ? 'P' : 'A'}`,
        isoTime: `2026-11-15T${String(13 + idx).padStart(2, '0')}:00:00Z`,
        tempF: 36 + Math.round(Math.sin((idx / 11) * Math.PI) * 9),
        precipPct: idx === 5 ? 25 : 5,
        shortForecast: 'Sunny',
        isDaytime: idx < 9,
      })),
      periods: [],
      alerts: [],
    },
    river: {
      siteName: 'Housatonic River near Falls Village, CT',
      siteCode: '01199000',
      dischargeCfs: 640,
      gageHeightFt: 2.84,
      waterTempF: 44,
      statusLabel: 'IDEAL WADING',
      anglerNote: 'Crisp pocket water through West Cornwall & Housatonic Meadows.',
      observedAt: '2026-11-15T12:15:00.000Z',
    },
    almanac: {
      dateIso: '2026-11-15',
      weekdayShort: 'SUN',
      weekdayLong: 'Sunday',
      monthDayLabel: 'NOV 15',
      fullDateLabel: 'Sunday, November 15, 2026',
      editionTimeLabel: '7:30 AM',
      daypart: 'morning',
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
  };
}

describe('800x480 Room-Readable Single-Focus Posters (ADR 0002)', () => {
  const expectations: Array<{ arch: ArchetypeId; mustInclude: string }> = [
    { arch: 'dispatch', mustInclude: 'HOUSATONIC RIVER' },
    { arch: 'broadsheet', mustInclude: 'Town Launches New CornwallCT.gov Civic Portal' },
    { arch: 'handbill', mustInclude: 'Sunday Author Talk &amp; Cider' },
    { arch: 'almanac', mustInclude: 'CORNWALL ALMANAC' },
    { arch: 'poster', mustInclude: 'AROUND CORNWALL • SPECIAL DISPATCH' },
  ];

  for (const { arch, mustInclude } of expectations) {
    it(`renders ${arch} single-focus poster cleanly at 800x480`, () => {
      const ed = makeFixtureEdition(arch);
      const html = renderEditionHtml(ed);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain(`data-archetype="${arch}"`);
      expect(html).toContain('The Cornwall Dispatch');
      expect(html).toContain(mustInclude);
      expect(html).not.toContain('preview-mode"');
    });
  }

  it('includes interactive switcher toolbar and 1-bit simulator in preview mode', () => {
    const ed = makeFixtureEdition('broadsheet');
    const html = renderEditionHtml(ed, { previewFrame: true });
    expect(html).toContain('preview-mode eink-sim');
    expect(html).toContain('archetype=handbill');
  });

  it('enforces >= 14px font-size floor and >= 2.5px SVG stroke-width floor across all 5 raw posters', () => {
    const archetypes: ArchetypeId[] = ['dispatch', 'broadsheet', 'handbill', 'almanac', 'poster'];
    for (const arch of archetypes) {
      const ed = makeFixtureEdition(arch);
      if (arch === 'dispatch') {
        // Exercise both max and min callouts (minIdx > 1) and precipitation bars
        ed.weather.hourly = ed.weather.hourly.map((pt, idx) => ({
          ...pt,
          tempF: 48 - idx * 2,
          precipPct: idx === 4 ? 45 : pt.precipPct,
        }));
      }
      const html = renderEditionHtml(ed);
      const screenCss = html.split('\n  .screen {')[1]?.split('</style>')[0] ?? '';
      const bodyMarkup = html.split('<body')[1] ?? '';

      const cssFontSizes = [
        ...screenCss.matchAll(/font-size:\s*([0-9.]+)px/g),
        ...bodyMarkup.matchAll(/font-size:\s*([0-9.]+)px/g),
        ...bodyMarkup.matchAll(/font-size="([0-9.]+)"/g),
      ].map((m) => Number(m[1]));

      expect(cssFontSizes.length).toBeGreaterThan(0);
      for (const px of cssFontSizes) {
        expect(px, `${arch} font-size ${px}px must be >= 14px`).toBeGreaterThanOrEqual(14);
      }

      const svgStrokeWidths = [...bodyMarkup.matchAll(/stroke-width="([0-9.]+)"/g)].map((m) =>
        Number(m[1]),
      );
      if (arch !== 'poster') {
        expect(svgStrokeWidths.length).toBeGreaterThan(0);
      }
      for (const sw of svgStrokeWidths) {
        expect(sw, `${arch} stroke-width ${sw} must be >= 2.5`).toBeGreaterThanOrEqual(2.5);
      }
    }
  });
});
