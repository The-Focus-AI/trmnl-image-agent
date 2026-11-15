import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { extractText, getDocumentProxy } from 'unpdf';
import type {
  ChronicleDigest,
  ChronicleExtractionTrace,
  ChronicleSourcePdfMeta,
  ParallelExtractedPage,
  ParallelExtractFailure,
} from '../types.js';
import { parallelChatJson, postParallelJson } from './parallel.js';

const CHRONICLE_HOME = 'https://cornwallchronicle.org/';

interface CachedChronicleRecord {
  pdfUrl: string;
  insertPdfUrls: string[];
  sourcePdfs: ChronicleSourcePdfMeta[];
  parallelExtractItems: ParallelExtractedPage[];
  parallelExtractErrors: ParallelExtractFailure[];
  pageRoutingSummary: string;
  combinedChars: number;
  chunkCount: number;
  expiresAt: number;
  digest: ChronicleDigest;
}

// Module-level cache across warm serverless invocations / local dev
let cachedDigest: CachedChronicleRecord | null = null;

function getChronicleCachePaths(): string[] {
  if (process.env.VERCEL) {
    return ['/tmp/cornwall-chronicle-cache.json'];
  }
  return [
    resolve(process.cwd(), 'logs/chronicle-cache.json'),
    '/tmp/cornwall-chronicle-cache.json',
  ];
}

async function readDiskChronicleCache(): Promise<CachedChronicleRecord | null> {
  for (const p of getChronicleCachePaths()) {
    try {
      const raw = await readFile(p, 'utf8');
      const parsed = JSON.parse(raw) as CachedChronicleRecord;
      if (parsed?.pdfUrl && parsed?.digest && parsed.expiresAt > Date.now()) {
        return parsed;
      }
    } catch {
      // Try next path
    }
  }
  return null;
}

async function writeDiskChronicleCache(record: CachedChronicleRecord): Promise<void> {
  const payload = JSON.stringify(record, null, 2);
  for (const p of getChronicleCachePaths()) {
    try {
      await mkdir(dirname(p), { recursive: true });
      await writeFile(p, payload, 'utf8');
      return;
    } catch {
      // Try next path
    }
  }
}

async function clearDiskChronicleCache(): Promise<void> {
  for (const p of getChronicleCachePaths()) {
    await rm(p, { force: true }).catch(() => {});
  }
}

const CHRONICLE_EVENTS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    issueLabel: {
      type: 'string',
      description: 'Month and year of the Cornwall Chronicle issue, e.g. NOVEMBER 2026.',
    },
    events: {
      type: 'array',
      description:
        'Notable public community events from the calendar grid and full-page flyers: author talks, art openings, fairs, markets, library programs, concerts, guided walks, holiday gatherings, and Annual Town Meetings. STRICTLY EXCLUDE routine municipal board/committee administrative meetings (Board of Selectmen, Board of Finance, P&Z, ZBA, Inland Wetlands, Park & Rec routine Zoom meetings). Include both current-month and Save-the-Date next-month items.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          date: {
            type: 'string',
            description:
              'ISO date YYYY-MM-DD when specific, or recurring rule like EVERY THU or EVERY TUE.',
          },
          time: {
            type: 'string',
            description: 'Short time label like 4 PM, 10 AM-3 PM, or 7 PM.',
          },
          title: {
            type: 'string',
            description: 'Concise event title (max 42 chars).',
          },
          location: {
            type: 'string',
            description: 'Short venue name like Town Hall, Cornwall Library, UCC, Wish House.',
          },
          summary: {
            type: 'string',
            description: 'One short storefront-friendly sentence describing the event.',
          },
          isMajor: {
            type: 'boolean',
            description:
              'True for marquee town-wide events and full-page flyer events (fairs, concerts, Cornwall Reads Cornwall, Parade of Lights, Annual Meetings).',
          },
        },
        required: ['date', 'time', 'title', 'location', 'summary', 'isMajor'],
      },
    },
  },
  required: ['issueLabel', 'events'],
};

const CHRONICLE_EDITORIAL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    issueLabel: {
      type: 'string',
      description: 'Month and year of the Cornwall Chronicle issue, e.g. NOVEMBER 2026.',
    },
    briefs: {
      type: 'array',
      description:
        '5 to 9 notable local Cornwall civic briefs, town news items, and feature story takeaways from this issue. Preserve exact years/dates in BOTH headline and detail so prior-year retrospectives (e.g. 2024 turnout) are never mistaken for current-year breaking news.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          headline: {
            type: 'string',
            description:
              'Crisp newspaper headline (max 52 chars). If the item cites a prior-year award/statistic (e.g. 2024), include that year in the headline.',
          },
          detail: {
            type: 'string',
            description:
              '1-2 concise sentences (max 150 chars) with specific Cornwall facts and exact dates/years.',
          },
          eventDate: {
            type: 'string',
            description:
              'If this brief strictly announces a specific one-time hearing/meeting/deadline date, return YYYY-MM-DD; otherwise empty string "".',
          },
          isRetrospective: {
            type: 'boolean',
            description:
              'True if the item primarily looks back at a prior year (e.g. 2024 election turnout or historical anecdote) rather than a new current-month development.',
          },
        },
        required: ['headline', 'detail', 'eventDate', 'isRetrospective'],
      },
    },
    natureAndLore: {
      type: 'array',
      description:
        '3 to 6 charming Cornwall nature observations, cultural notes, or local history nuggets from essays, Nature Notes, or insert notices.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'Short title (max 40 chars).' },
          snippet: {
            type: 'string',
            description: 'Vivid 1-2 sentence takeaway (max 165 chars).',
          },
          byline: {
            type: 'string',
            description: 'Author name if credited, or empty string "".',
          },
        },
        required: ['title', 'snippet', 'byline'],
      },
    },
  },
  required: ['issueLabel', 'briefs', 'natureAndLore'],
};

/**
 * Collapses spaced display kerning common on Chronicle flyer pages
 * (e.g. "C o r n w a l l L i b r a r y . o r g" -> "CornwallLibrary.org").
 */
function dekernDisplayType(raw: string): string {
  return raw
    .replace(/\b([A-Za-z0-9])(?: ([A-Za-z0-9.,:-])){3,}/g, (match) =>
      match.replace(/ /g, '').replace(/,/g, ', '),
    )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function discoverLatestChroniclePdfUrls(): Promise<{
  mainPdfUrl: string | null;
  insertPdfUrls: string[];
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(CHRONICLE_HOME, { signal: controller.signal });
    if (!res.ok) return { mainPdfUrl: null, insertPdfUrls: [] };
    const html = await res.text();
    const matches =
      html.match(/https?:\/\/cornwallchronicle\.org\/wp-content\/uploads\/[^"' >]+\.pdf/gi) ??
      [];

    const normalized = Array.from(
      new Set(matches.map((u) => u.replace(/^http:\/\//i, 'https://'))),
    );

    const monthIssue = normalized.find((u) =>
      /(January|February|March|April|May|June|July|August|September|October|November|December)[_-]\d{4}\.pdf$/i.test(
        u,
      ),
    );
    const mainPdfUrl = monthIssue ?? normalized[0] ?? null;
    const insertPdfUrls = normalized.filter((u) => u !== mainPdfUrl).slice(0, 2);
    return { mainPdfUrl, insertPdfUrls };
  } catch {
    return { mainPdfUrl: null, insertPdfUrls: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function extractPdfPagesLocalFallback(url: string): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const raw = await res.arrayBuffer();
    if (raw.byteLength > 20 * 1024 * 1024) return [];
    const pdf = await getDocumentProxy(new Uint8Array(raw), { verbosity: 0 });
    const { text } = await extractText(pdf, { mergePages: false });
    return text.map((p) => dekernDisplayType(p)).filter((p) => p.length > 0);
  } catch (err) {
    console.warn(`[chronicle] fallback page parse failed on ${url}:`, err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function splitIntoBatches(blocks: string[], maxChars = 16_500): string[] {
  const batches: string[] = [];
  let current = '';
  for (const block of blocks) {
    const trimmed = block.slice(0, maxChars);
    if (!current) {
      current = trimmed;
    } else if (current.length + 2 + trimmed.length <= maxChars) {
      current += `\n\n${trimmed}`;
    } else {
      batches.push(current);
      current = trimmed;
    }
  }
  if (current) batches.push(current);
  return batches;
}

function toTraceFromCache(
  cache: CachedChronicleRecord,
  startedAt: number,
  fromCache: boolean,
): ChronicleExtractionTrace {
  return {
    fromCache,
    elapsedMs: Date.now() - startedAt,
    discoveredMainPdfUrl: cache.pdfUrl,
    discoveredInsertPdfUrls: cache.insertPdfUrls,
    sourcePdfs: cache.sourcePdfs,
    parallelExtractItems: cache.parallelExtractItems,
    parallelExtractErrors: cache.parallelExtractErrors,
    pageRoutingSummary: cache.pageRoutingSummary,
    combinedChars: cache.combinedChars,
    chunkCount: cache.chunkCount,
    digest: cache.digest,
  };
}

export async function fetchAndParseChronicleWithMeta(): Promise<ChronicleExtractionTrace> {
  const startedAt = Date.now();
  if (!cachedDigest) {
    cachedDigest = await readDiskChronicleCache();
  }

  const { mainPdfUrl, insertPdfUrls } = await discoverLatestChroniclePdfUrls();
  if (!mainPdfUrl) {
    if (cachedDigest) return toTraceFromCache(cachedDigest, startedAt, true);
    return {
      fromCache: false,
      elapsedMs: Date.now() - startedAt,
      discoveredMainPdfUrl: null,
      discoveredInsertPdfUrls: [],
      sourcePdfs: [],
      parallelExtractItems: [],
      parallelExtractErrors: [],
      combinedChars: 0,
      chunkCount: 0,
      digest: null,
    };
  }

  if (
    cachedDigest &&
    cachedDigest.pdfUrl === mainPdfUrl &&
    cachedDigest.expiresAt > Date.now()
  ) {
    return toTraceFromCache(cachedDigest, startedAt, true);
  }

  const parallelKey = process.env.PARALLEL_API_KEY?.trim();
  if (!parallelKey) {
    if (cachedDigest) return toTraceFromCache(cachedDigest, startedAt, true);
    return {
      fromCache: false,
      elapsedMs: Date.now() - startedAt,
      discoveredMainPdfUrl: mainPdfUrl,
      discoveredInsertPdfUrls: insertPdfUrls,
      sourcePdfs: [],
      parallelExtractItems: [],
      parallelExtractErrors: [],
      combinedChars: 0,
      chunkCount: 0,
      digest: null,
    };
  }

  try {
    const allUrls = [mainPdfUrl, ...insertPdfUrls];

    // Step 1: Primary extraction via Parallel /v1/extract (same engine as platform.parallel.ai/play/extract).
    // Omit custom fetch_policy so immutable monthly PDFs use Parallel's dynamic index + native 15s-60s PDF fetch window
    // rather than forcing a 12s live re-crawl against cornwallchronicle.org's WAF every 24h.
    const extractRes = await postParallelJson<{
      results?: Array<{
        url?: string;
        title?: string;
        publish_date?: string;
        full_content?: string;
        excerpts?: string[];
      }>;
      errors?: Array<{
        url?: string;
        error_type?: string;
        http_status_code?: number;
        error?: string;
      }>;
    }>(
      '/v1/extract',
      {
        urls: allUrls,
        objective:
          'Extract the Cornwall Chronicle issue month/year, all community calendar dates and event flyers, Cornwall Briefs civic news, and Nature Notes / local lore.',
        search_queries: [
          'community calendar events schedule AM PM',
          'Cornwall Briefs Town Hall Library',
          'Nature Notes observations local history',
        ],
        advanced_settings: {
          excerpt_settings: {
            max_chars_per_result: 20_000,
          },
          full_content: {
            max_chars_per_result: 60_000,
          },
        },
      },
      parallelKey,
      28_000,
    );

    const parallelExtractItems: ParallelExtractedPage[] = [];
    const parallelExtractErrors: ParallelExtractFailure[] = [];
    const extractedByUrl = new Map<
      string,
      { fullMarkdown: string; excerpts: string[] }
    >();

    for (const r of extractRes?.results ?? []) {
      const url = String(r.url ?? '');
      const excerpts = Array.isArray(r.excerpts)
        ? r.excerpts.map((e) => dekernDisplayType(String(e ?? ''))).filter(Boolean)
        : [];
      const fullMarkdown = r.full_content ? dekernDisplayType(r.full_content) : '';
      if (url && (fullMarkdown || excerpts.length > 0)) {
        extractedByUrl.set(url, { fullMarkdown, excerpts });
        parallelExtractItems.push({
          url,
          title: String(r.title ?? url.split('/').pop() ?? 'Chronicle PDF'),
          publishedAt: r.publish_date ? String(r.publish_date) : undefined,
          excerpts,
          ...(fullMarkdown ? { fullContentPreview: fullMarkdown.slice(0, 2500) } : {}),
        });
      }
    }

    for (const err of extractRes?.errors ?? []) {
      const statusSuffix = err.http_status_code ? ` (HTTP ${err.http_status_code})` : '';
      parallelExtractErrors.push({
        url: String(err.url ?? ''),
        error: `${String(err.error ?? err.error_type ?? 'extract_error')}${statusSuffix}`,
      });
    }

    // Step 2: Classify extracted content into Calendar/Flyer Track vs Editorial/Briefs Track
    const sourcePdfs: ChronicleSourcePdfMeta[] = [];
    const calendarBlocks: string[] = [];
    const editorialBlocks: string[] = [];
    const calendarRouteLabels: string[] = [];
    const editorialRouteLabels: string[] = [];
    let combinedChars = 0;

    for (const url of allUrls) {
      const shortName = url.split('/').pop() ?? url;
      const isInsert = url !== mainPdfUrl;
      const fromParallel = extractedByUrl.get(url);

      if (fromParallel) {
        const text =
          fromParallel.fullMarkdown || fromParallel.excerpts.join('\n\n');
        sourcePdfs.push({
          url,
          method: 'parallel-extract',
          charCount: text.length,
        });
        combinedChars += text.length;

        if (isInsert || text.length < 3500) {
          calendarBlocks.push(`### INSERT / FLYER (${shortName}):\n${text}`);
          editorialBlocks.push(`### INSERT NOTE (${shortName}):\n${text}`);
          calendarRouteLabels.push(`${shortName} [parallel]`);
        } else {
          // Parallel /v1/extract returned the multi-page PDF in Markdown!
          // Split across paragraph boundaries so pages 4-7 (Cornwall Briefs & back-page flyers) are never truncated at 16k chars.
          const markdownSections = splitIntoBatches(text.split(/\n{2,}/), 14_500);
          markdownSections.forEach((sec, sIdx) => {
            const label = `${shortName}#${sIdx + 1}`;
            const timeHits = (
              sec.match(/\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|AM|PM|noon)\b/gi) ??
              []
            ).length;
            const hasCalCue =
              /\b(SUNDAY|MONDAY|COMING EVENTS|Annual|Fair|Exhibition|Library)\b/i.test(sec) ||
              timeHits >= 4;
            if (hasCalCue) {
              calendarBlocks.push(`### CHRONICLE EXTRACT (${label}):\n${sec}`);
              calendarRouteLabels.push(`${label}[parallel]`);
            }
            editorialBlocks.push(`### CHRONICLE EDITORIAL (${label}):\n${sec}`);
            editorialRouteLabels.push(`${label}[parallel]`);
          });
        }
        continue;
      }

      // Local page-aware fallback ONLY when origin WAF returns HTTP 202 to Parallel's crawler
      const pages = await extractPdfPagesLocalFallback(url);
      const totalPdfChars = pages.reduce((acc, p) => acc + p.length, 0);
      sourcePdfs.push({
        url,
        method: totalPdfChars > 0 ? 'unpdf' : 'empty',
        charCount: totalPdfChars,
      });
      combinedChars += totalPdfChars;

      pages.forEach((pageText, idx) => {
        const pageNum = idx + 1;
        const timeHits = (
          pageText.match(/\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|AM|PM|noon)\b/gi) ??
          []
        ).length;
        const hasCalendarGridHeader =
          /\bSUNDAY\s+MONDAY\s+TUESDAY\b/i.test(pageText) ||
          /\bCOMING EVENTS\b/i.test(pageText);
        const isFlyerPage = pageText.length < 2800 || isInsert;
        const isCalendarPage = hasCalendarGridHeader || timeHits >= 8 || isFlyerPage;
        const isEditorialPage = !hasCalendarGridHeader && pageText.length >= 2000;

        if (isCalendarPage) {
          calendarBlocks.push(
            `### ${shortName} PAGE ${pageNum}${isFlyerPage ? ' (FLYER)' : ' (CALENDAR)'}:\n${pageText}`,
          );
          calendarRouteLabels.push(`p${pageNum}${isFlyerPage ? '(flyer)' : '(cal)'}`);
        }
        if (isEditorialPage) {
          editorialBlocks.push(`### ${shortName} PAGE ${pageNum}:\n${pageText}`);
          editorialRouteLabels.push(`p${pageNum}`);
        }
      });
    }

    if (calendarBlocks.length === 0 && editorialBlocks.length === 0) {
      if (cachedDigest) return toTraceFromCache(cachedDigest, startedAt, true);
      return {
        fromCache: false,
        elapsedMs: Date.now() - startedAt,
        discoveredMainPdfUrl: mainPdfUrl,
        discoveredInsertPdfUrls: insertPdfUrls,
        sourcePdfs,
        parallelExtractItems,
        parallelExtractErrors,
        combinedChars: 0,
        chunkCount: 0,
        digest: null,
      };
    }

    // Step 3: Focused two-track structured synthesis (Calendar/Flyers vs Editorial/Briefs)
    const calBatches = splitIntoBatches(calendarBlocks, 16_000).slice(0, 2);
    const edBatches = splitIntoBatches(editorialBlocks, 16_000).slice(0, 2);
    const totalCalls = calBatches.length + edBatches.length;

    const pageRoutingSummary = `Calendar/Flyer track: ${calendarRouteLabels.join(', ') || 'none'} (${calBatches.length} pass) • Editorial track: ${editorialRouteLabels.join(', ') || 'none'} (${edBatches.length} pass)`;

    const [calResults, edResults] = await Promise.all([
      Promise.all(
        calBatches.map((batch, idx) =>
          parallelChatJson<{
            issueLabel?: string;
            events?: ChronicleDigest['events'];
          }>({
            systemPrompt:
              'You extract structured public community events strictly from the supplied Cornwall Chronicle calendar & flyer pages without inventing facts.',
            userPrompt: `Extract the issue month/year and all notable public community events (talks, art shows, fairs, markets, concerts, library programs, walks, holiday events, Annual Meetings — EXCLUDE routine Board of Selectmen, Board of Finance, P&Z, ZBA, and Inland Wetlands meetings) from calendar/flyer batch ${idx + 1}/${calBatches.length}. Use exact YYYY-MM-DD dates whenever a specific calendar date is given.\n\n${batch}`,
            schemaName: 'chronicle_events',
            schema: CHRONICLE_EVENTS_SCHEMA,
            model: 'lite',
            timeoutMs: 34_000,
          }),
        ),
      ),
      Promise.all(
        edBatches.map((batch, idx) =>
          parallelChatJson<{
            issueLabel?: string;
            briefs?: ChronicleDigest['briefs'];
            natureAndLore?: ChronicleDigest['natureAndLore'];
          }>({
            systemPrompt:
              'You extract structured hyperlocal newspaper briefs and nature/history notes strictly from the supplied Cornwall Chronicle editorial pages without inventing facts.',
            userPrompt: `Extract the issue month/year, notable Cornwall civic/community news briefs, and charming Cornwall nature observations or local lore from editorial batch ${idx + 1}/${edBatches.length}. CRITICAL TEMPORAL RULE: Remember this monthly newsletter was printed at the start of the month. Never rewrite a retrospective essay about a prior year (e.g. 2024 voter turnout when another town won in 2025) as a present-tense current win — always put the exact year in the headline and mark isRetrospective=true. If a brief announces a specific dated hearing/meeting, populate eventDate as YYYY-MM-DD.\n\n${batch}`,
            schemaName: 'chronicle_editorial',
            schema: CHRONICLE_EDITORIAL_SCHEMA,
            model: 'lite',
            timeoutMs: 32_000,
          }),
        ),
      ),
    ]);

    const validCal = calResults.filter(
      (r): r is NonNullable<(typeof calResults)[number]> => Boolean(r),
    );
    const validEd = edResults.filter(
      (r): r is NonNullable<(typeof edResults)[number]> => Boolean(r),
    );

    if (validCal.length === 0 && validEd.length === 0) {
      if (cachedDigest) return toTraceFromCache(cachedDigest, startedAt, true);
      return {
        fromCache: false,
        elapsedMs: Date.now() - startedAt,
        discoveredMainPdfUrl: mainPdfUrl,
        discoveredInsertPdfUrls: insertPdfUrls,
        sourcePdfs,
        parallelExtractItems,
        parallelExtractErrors,
        pageRoutingSummary,
        combinedChars,
        chunkCount: totalCalls,
        digest: null,
      };
    }

    const issueLabel =
      [...validCal, ...validEd]
        .map((c) => c.issueLabel?.trim())
        .find((lbl) => lbl && !/unknown|not specified/i.test(lbl)) ?? 'CURRENT ISSUE';

    const seenEvents = new Set<string>();
    const mergedEvents: ChronicleDigest['events'] = [];
    for (const c of validCal) {
      for (const ev of c.events ?? []) {
        const key = `${ev.date}:${ev.title.toLowerCase()}`;
        if (!seenEvents.has(key)) {
          seenEvents.add(key);
          mergedEvents.push(ev);
        }
      }
    }

    const seenBriefs = new Set<string>();
    const mergedBriefs: ChronicleDigest['briefs'] = [];
    for (const c of validEd) {
      for (const b of c.briefs ?? []) {
        const key = b.headline.toLowerCase().trim();
        if (key && !seenBriefs.has(key)) {
          seenBriefs.add(key);
          mergedBriefs.push(b);
        }
      }
    }

    const seenLore = new Set<string>();
    const mergedLore: ChronicleDigest['natureAndLore'] = [];
    for (const c of validEd) {
      for (const n of c.natureAndLore ?? []) {
        const key = n.title.toLowerCase().trim();
        if (key && !seenLore.has(key)) {
          seenLore.add(key);
          mergedLore.push({
            title: n.title,
            snippet: n.snippet,
            ...(n.byline ? { byline: n.byline } : {}),
          });
        }
      }
    }

    const digest: ChronicleDigest = {
      issueLabel,
      pdfUrl: mainPdfUrl,
      fetchedAt: new Date().toISOString(),
      events: mergedEvents,
      briefs: mergedBriefs.slice(0, 16),
      natureAndLore: mergedLore.slice(0, 12),
    };

    cachedDigest = {
      pdfUrl: mainPdfUrl,
      insertPdfUrls,
      sourcePdfs,
      parallelExtractItems,
      parallelExtractErrors,
      pageRoutingSummary,
      combinedChars,
      chunkCount: totalCalls,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      digest,
    };
    await writeDiskChronicleCache(cachedDigest);

    return toTraceFromCache(cachedDigest, startedAt, false);
  } catch (err) {
    console.error('[chronicle] Parallel PDF parse failed:', err);
    if (cachedDigest) return toTraceFromCache(cachedDigest, startedAt, true);
    return {
      fromCache: false,
      elapsedMs: Date.now() - startedAt,
      discoveredMainPdfUrl: mainPdfUrl,
      discoveredInsertPdfUrls: insertPdfUrls,
      sourcePdfs: [],
      parallelExtractItems: [],
      parallelExtractErrors: [],
      combinedChars: 0,
      chunkCount: 0,
      digest: null,
    };
  }
}

export async function fetchAndParseChronicle(): Promise<ChronicleDigest | null> {
  const res = await fetchAndParseChronicleWithMeta();
  return res.digest;
}

/**
 * Fetch Chronicle digest via the Vercel 24h CDN-cached /api/chronicle endpoint when deployed,
 * falling back to direct in-process parsing in local dev or on cache warm.
 */
export async function getChronicleDigestWithMeta(
  requestOrigin?: string,
  forceRefresh = false,
): Promise<ChronicleExtractionTrace> {
  const startedAt = Date.now();
  if (!forceRefresh && !cachedDigest) {
    cachedDigest = await readDiskChronicleCache();
  }
  if (!forceRefresh && cachedDigest && cachedDigest.expiresAt > Date.now()) {
    return toTraceFromCache(cachedDigest, startedAt, true);
  }

  if (
    !forceRefresh &&
    requestOrigin &&
    !requestOrigin.includes('localhost') &&
    !requestOrigin.includes('127.0.0.1')
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 32_000);
    try {
      const res = await fetch(`${requestOrigin}/api/chronicle`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const digest = (await res.json()) as ChronicleDigest;
        if (digest?.pdfUrl) {
          cachedDigest = {
            pdfUrl: digest.pdfUrl,
            insertPdfUrls: [],
            sourcePdfs: [{ url: digest.pdfUrl, method: 'parallel-extract', charCount: 0 }],
            parallelExtractItems: [],
            parallelExtractErrors: [],
            pageRoutingSummary: 'Served via 24h Edge CDN /api/chronicle',
            combinedChars: 0,
            chunkCount: 0,
            expiresAt: Date.now() + 6 * 60 * 60 * 1000,
            digest,
          };
          return toTraceFromCache(cachedDigest, startedAt, true);
        }
      }
    } catch {
      // Fall through to direct parse
    } finally {
      clearTimeout(timer);
    }
  }

  if (forceRefresh) {
    cachedDigest = null;
    await clearDiskChronicleCache();
  }
  return fetchAndParseChronicleWithMeta();
}

export async function getChronicleDigest(requestOrigin?: string): Promise<ChronicleDigest | null> {
  const res = await getChronicleDigestWithMeta(requestOrigin);
  return res.digest;
}
