export type Daypart = 'morning' | 'midday' | 'evening' | 'weekend';

export type ArchetypeId =
  | 'broadsheet'
  | 'handbill'
  | 'almanac'
  | 'dispatch'
  | 'poster';

export type SeasonalWindowId =
  | 'maple_sap'
  | 'mohawk_ski'
  | 'housatonic_river'
  | 'farmers_market'
  | 'spring_garden'
  | 'summer_harvest'
  | 'frost_watch'
  | 'autumn_foliage'
  | 'winter_hearth';

export interface HourlyPoint {
  hourLabel: string;
  isoTime: string;
  tempF: number;
  precipPct: number;
  shortForecast: string;
  isDaytime: boolean;
}

export interface ForecastDay {
  name: string;
  tempF: number;
  isDaytime: boolean;
  precipPct: number;
  shortForecast: string;
  detailedForecast: string;
}

export interface WeatherAlert {
  event: string;
  headline: string;
  severity: string;
  description: string;
}

export interface WeatherData {
  fetchedAt: string;
  currentTempF: number;
  conditions: string;
  wind: string;
  highF: number;
  lowF: number;
  todayPrecipPct: number;
  tonightPrecipPct: number;
  todaySummary: string;
  tonightSummary: string;
  tomorrowSummary: string;
  hourly: HourlyPoint[];
  periods: ForecastDay[];
  alerts: WeatherAlert[];
}

export interface RiverData {
  siteName: string;
  siteCode: string;
  dischargeCfs: number | null;
  gageHeightFt: number | null;
  waterTempF: number | null;
  statusLabel: string;
  anglerNote: string;
  observedAt: string | null;
}

export interface AlmanacData {
  dateIso: string;
  weekdayShort: string;
  weekdayLong: string;
  monthDayLabel: string;
  fullDateLabel: string;
  editionTimeLabel: string;
  daypart: Daypart;
  sunrise: string;
  sunset: string;
  dayLengthLabel: string;
  daylightDeltaLabel: string;
  moonPhaseName: string;
  moonIlluminationPct: number;
  moonPhaseFraction: number; // 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
  phenologyNote: string;
}

export interface ChronicleEvent {
  date: string; // YYYY-MM-DD or recurring label
  time: string;
  title: string;
  location: string;
  summary: string;
  isMajor: boolean;
}

export interface ChronicleDigest {
  issueLabel: string;
  pdfUrl: string;
  fetchedAt: string;
  events: ChronicleEvent[];
  briefs: Array<{ headline: string; detail: string }>;
  natureAndLore: Array<{ title: string; snippet: string; byline?: string }>;
}

export interface EligibleSeasonalCandidate {
  id: SeasonalWindowId;
  label: string;
  windowRule: string;
  factualContext: string;
}

export interface WebEvidenceSnippet {
  source: string;
  url: string;
  title: string;
  excerpt: string;
  publishedAt?: string;
}

export interface DecisionRoutingResult {
  provider: 'parallel' | 'deterministic';
  archetype: ArchetypeId;
  spotlightId: SeasonalWindowId;
  hasUrgentBanner: boolean;
  isMohawkSkiOpen: boolean;
  hasSchoolDisruption: boolean;
  probabilities: Record<string, number>;
  citations: WebEvidenceSnippet[];
}

export interface TownDispatchItem {
  kicker: string;
  headline: string;
  body: string;
}

export interface UpcomingEventItem {
  whenLabel: string;
  title: string;
  whereAndTime: string;
}

export interface SeasonalSpotlight {
  windowId: SeasonalWindowId;
  kicker: string;
  headline: string;
  metric: string;
  body: string;
}

export interface Edition {
  generatedAt: string;
  dateLabel: string;
  editionLabel: string; // e.g. "MORNING EDITION"
  volumeLabel: string; // e.g. "WEST CORNWALL & CORNWALL BRIDGE, CT"
  daypart: Daypart;
  archetype: ArchetypeId;
  alertBanner: string | null;
  leadStory: {
    kicker: string;
    headline: string;
    deck: string;
    body: string;
  };
  weatherCallout: {
    summaryLine: string;
    lookaheadLine: string;
  };
  dispatches: TownDispatchItem[];
  upcomingEvents: UpcomingEventItem[];
  seasonalSpotlight: SeasonalSpotlight;
  almanacFeature: {
    whenLabel?: string;
    title: string;
    note: string;
  };
  weather: WeatherData;
  river: RiverData;
  almanac: AlmanacData;
  routingMeta: {
    decisionProvider: string;
    chronicleIssue: string;
  };
}
