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

export interface ChronicleBrief {
  headline: string;
  detail: string;
  eventDate?: string; // YYYY-MM-DD if announcing a specific one-time hearing/deadline/event
  isRetrospective?: boolean; // True when looking back at a prior year's event/statistic
}

export interface ChronicleDigest {
  issueLabel: string;
  pdfUrl: string;
  fetchedAt: string;
  events: ChronicleEvent[];
  briefs: ChronicleBrief[];
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

export interface ParallelExtractedPage {
  url: string;
  title: string;
  publishedAt?: string;
  excerpts: string[];
  fullContentPreview?: string;
}

export interface ParallelExtractFailure {
  url: string;
  error: string;
}

export interface ParallelExtractTrace {
  attempted: boolean;
  ok: boolean;
  elapsedMs: number;
  urls: string[];
  objective: string;
  results: ParallelExtractedPage[];
  failedResults: ParallelExtractFailure[];
}

export interface ParallelSearchHit {
  url: string;
  title: string;
  publishedAt?: string;
  excerpts: string[];
}

export interface ParallelSearchTrace {
  attempted: boolean;
  ok: boolean;
  elapsedMs: number;
  objective: string;
  searchQueries: string[];
  results: ParallelSearchHit[];
}

export interface ChronicleSourcePdfMeta {
  url: string;
  method: 'unpdf' | 'parallel-extract' | 'empty';
  charCount: number;
}

export interface ChronicleExtractionTrace {
  fromCache: boolean;
  elapsedMs: number;
  discoveredMainPdfUrl: string | null;
  discoveredInsertPdfUrls: string[];
  sourcePdfs: ChronicleSourcePdfMeta[];
  parallelExtractItems?: ParallelExtractedPage[];
  parallelExtractErrors?: ParallelExtractFailure[];
  pageRoutingSummary?: string;
  combinedChars: number;
  chunkCount: number;
  digest: ChronicleDigest | null;
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
  elapsedMs?: number;
  questionsAsked?: Record<string, unknown>;
  rawAnswers?: Record<string, unknown> | null;
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

export interface CopySynthesisTrace {
  provider: 'parallel' | 'fallback';
  model: string;
  elapsedMs: number;
  contextChars: number;
  rawOutput?: Record<string, unknown> | null;
}

export type DispatchHistoryTrigger = 'cron' | 'admin-refresh' | 'live-miss';

export interface FullDataView {
  capturedAt: string;
  totalElapsedMs: number;
  parallelConfigured: boolean;
  leadArchetype: ArchetypeId;
  edition: Edition;
  eligibleWindows: EligibleSeasonalCandidate[];
  upcomingChronicleEvents: ChronicleEvent[];
  parallel: {
    extract: ParallelExtractTrace;
    search: ParallelSearchTrace;
    chronicle: ChronicleExtractionTrace;
    decisions: DecisionRoutingResult;
    copySynthesis: CopySynthesisTrace;
    snippetsSentToSynthesis: WebEvidenceSnippet[];
  };
}

export interface DispatchHistoryEntry {
  id: string;
  timestamp: string;
  trigger: DispatchHistoryTrigger;
  dateLabel: string;
  editionLabel: string;
  daypart: Daypart;
  leadArchetype: ArchetypeId;
  spotlightId: SeasonalWindowId;
  decisionProvider: 'parallel' | 'deterministic';
  copyProvider: 'parallel' | 'fallback';
  headline: string;
  alertBanner: string | null;
  weatherSummary: string;
  riverSummary: string;
  chronicleIssue: string;
  counts: {
    extractedPages: number;
    searchHits: number;
    decisionCitations: number;
    chronicleEvents: number;
    chronicleBriefs: number;
  };
  elapsedMs: number;
}

export interface StorageBackendStatus {
  backend: 'upstash-redis' | 'vercel-blob' | 'local-file';
  persistentInCloud: boolean;
  configured: {
    upstashRedis: boolean;
    vercelBlob: boolean;
  };
}

export interface AdminDataPayload {
  generatedAt: string;
  storage: StorageBackendStatus;
  currentView: FullDataView;
  history: DispatchHistoryEntry[];
}
