import { extractText } from 'unpdf';
import type { ChronicleDigest } from '../types.js';
import { parallelChatJson, postParallelJson } from './parallel.js';

const CHRONICLE_HOME = 'https://cornwallchronicle.org/';

// Module-level cache across warm serverless invocations / local dev
let cachedDigest: { pdfUrl: string; expiresAt: number; digest: ChronicleDigest } | null =
  null;

const CHRONICLE_SCHEMA: Record<string, unknown> = {
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
        'Notable public community events: author talks, art openings, fairs, markets, library programs, concerts, guided walks, holiday gatherings, and Annual Town Meetings. STRICTLY EXCLUDE routine municipal board/committee administrative meetings (Board of Selectmen, Board of Finance, P&Z, ZBA, Inland Wetlands, Park & Rec routine Zoom meetings). Include both current-month and Save-the-Date next-month items.',
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
              'True for marquee town-wide events (fairs, concerts, Cornwall Reads Cornwall, Parade of Lights, Town Meeting).',
          },
        },
        required: ['date', 'time', 'title', 'location', 'summary', 'isMajor'],
      },
    },
    briefs: {
      type: 'array',
      description:
        '4 to 7 notable local Cornwall civic briefs and feature story takeaways from this issue.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          headline: {
            type: 'string',
            description: 'Crisp newspaper headline (max 52 chars).',
          },
          detail: {
            type: 'string',
            description: '1-2 concise sentences (max 150 chars) with specific Cornwall facts.',
          },
        },
        required: ['headline', 'detail'],
      },
    },
    natureAndLore: {
      type: 'array',
      description:
        '3 to 5 charming Cornwall nature observations or local history nuggets from Nature Notes, Dog Walk Observations, or feature essays.',
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
  required: ['issueLabel', 'events', 'briefs', 'natureAndLore'],
};

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

async function extractPdfTextDirect(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return '';
    const raw = await res.arrayBuffer();
    if (raw.byteLength > 20 * 1024 * 1024) return '';
    const { text } = await extractText(new Uint8Array(raw), { mergePages: true });
    return text.trim();
  } catch (err) {
    console.warn(`[chronicle] unpdf failed on ${url}:`, err);
    return '';
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAndParseChronicle(): Promise<ChronicleDigest | null> {
  const { mainPdfUrl, insertPdfUrls } = await discoverLatestChroniclePdfUrls();
  if (!mainPdfUrl) return cachedDigest?.digest ?? null;

  if (
    cachedDigest &&
    cachedDigest.pdfUrl === mainPdfUrl &&
    cachedDigest.expiresAt > Date.now()
  ) {
    return cachedDigest.digest;
  }

  const parallelKey = process.env.PARALLEL_API_KEY?.trim();
  if (!parallelKey) return cachedDigest?.digest ?? null;

  try {
    const allUrls = [mainPdfUrl, ...insertPdfUrls];
    const directTexts: Array<{ url: string; text: string }> = [];
    for (const url of allUrls) {
      directTexts.push({ url, text: await extractPdfTextDirect(url) });
    }

    const missingUrls = directTexts.filter((d) => !d.text).map((d) => d.url);
    if (missingUrls.length > 0) {
      const extractRes = await postParallelJson<{
        results?: Array<{ url?: string; full_content?: string; excerpts?: string[] }>;
      }>(
        '/v1/extract',
        {
          urls: missingUrls,
          objective:
            'Extract the issue month/year, all community calendar events and flyers, Cornwall Briefs, and Nature Notes.',
          advanced_settings: {
            full_content: { max_chars_per_result: 45_000 },
          },
        },
        parallelKey,
        12_000,
      );
      for (const r of extractRes?.results ?? []) {
        const slot = directTexts.find((d) => d.url === r.url);
        if (slot && !slot.text) {
          slot.text =
            r.full_content?.trim() ||
            (Array.isArray(r.excerpts) ? r.excerpts.join('\n').trim() : '');
        }
      }
    }

    const combinedText = directTexts
      .filter((d) => d.text.length > 0)
      .map((d) => `### SOURCE PDF: ${d.url}\n${d.text.replace(/[ \t]+/g, ' ')}`)
      .join('\n\n');

    if (!combinedText) return cachedDigest?.digest ?? null;

    // Parallel /v1beta/chat/completions enforces a 20,000-char limit per message.
    // Split multi-page issues on line boundaries into <=17,500-char chunks and parse concurrently!
    const CHUNK_SIZE = 17_500;
    const cappedText = combinedText.slice(0, CHUNK_SIZE * 3);
    const chunks: string[] = [];
    let cursor = 0;
    while (cursor < cappedText.length) {
      let end = Math.min(cursor + CHUNK_SIZE, cappedText.length);
      if (end < cappedText.length) {
        const nl = cappedText.lastIndexOf('\n', end);
        if (nl > cursor + CHUNK_SIZE * 0.6) end = nl + 1;
      }
      chunks.push(cappedText.slice(cursor, end));
      cursor = end;
    }

    const chunkResults = await Promise.all(
      chunks.map((chunk, idx) =>
        parallelChatJson<{
          issueLabel?: string;
          events?: ChronicleDigest['events'];
          briefs?: ChronicleDigest['briefs'];
          natureAndLore?: ChronicleDigest['natureAndLore'];
        }>({
          systemPrompt:
            'You extract structured hyperlocal newspaper digests strictly from the supplied Cornwall Chronicle PDF text without searching the web or inventing facts.',
          userPrompt: `Extract notable public community calendar events (talks, art shows, fairs, concerts, library programs, walks, holiday events, Annual Town Meeting — EXCLUDE routine Board of Selectmen, Board of Finance, P&Z, ZBA, and Inland Wetlands meetings) and Cornwall Briefs & local news highlights from part ${idx + 1}/${chunks.length} of the Cornwall Chronicle (Cornwall, CT). Use exact YYYY-MM-DD dates whenever a specific calendar date is given.\n\nCORNWALL CHRONICLE PDF TEXT (PART ${idx + 1}/${chunks.length}):\n${chunk}`,
          schemaName: 'chronicle_digest',
          schema: CHRONICLE_SCHEMA,
          model: 'lite',
          timeoutMs: 28_000,
        }),
      ),
    );

    const validChunks = chunkResults.filter(
      (r): r is NonNullable<(typeof chunkResults)[number]> => Boolean(r),
    );
    if (validChunks.length === 0) return cachedDigest?.digest ?? null;

    const issueLabel =
      validChunks
        .map((c) => c.issueLabel?.trim())
        .find((lbl) => lbl && !/unknown|not specified/i.test(lbl)) ?? 'CURRENT ISSUE';

    const seenEvents = new Set<string>();
    const mergedEvents: ChronicleDigest['events'] = [];
    for (const c of validChunks) {
      for (const ev of c.events ?? []) {
        const key = `${ev.date}:${ev.title.toLowerCase()}`;
        if (!seenEvents.has(key)) {
          seenEvents.add(key);
          mergedEvents.push(ev);
        }
      }
    }

    const mergedBriefs = validChunks.flatMap((c) => c.briefs ?? []).slice(0, 8);
    const mergedLore = validChunks
      .flatMap((c) => c.natureAndLore ?? [])
      .slice(0, 6)
      .map((n) => ({
        title: n.title,
        snippet: n.snippet,
        ...(n.byline ? { byline: n.byline } : {}),
      }));

    const digest: ChronicleDigest = {
      issueLabel,
      pdfUrl: mainPdfUrl,
      fetchedAt: new Date().toISOString(),
      events: mergedEvents,
      briefs: mergedBriefs,
      natureAndLore: mergedLore,
    };

    cachedDigest = {
      pdfUrl: mainPdfUrl,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      digest,
    };

    return digest;
  } catch (err) {
    console.error('[chronicle] Parallel PDF parse failed:', err);
    return cachedDigest?.digest ?? null;
  }
}

/**
 * Fetch Chronicle digest via the Vercel 24h CDN-cached /api/chronicle endpoint when deployed,
 * falling back to direct in-process parsing in local dev or on cache warm.
 */
export async function getChronicleDigest(requestOrigin?: string): Promise<ChronicleDigest | null> {
  if (cachedDigest && cachedDigest.expiresAt > Date.now()) {
    return cachedDigest.digest;
  }

  if (
    requestOrigin &&
    !requestOrigin.includes('localhost') &&
    !requestOrigin.includes('127.0.0.1')
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18_000);
    try {
      const res = await fetch(`${requestOrigin}/api/chronicle`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const digest = (await res.json()) as ChronicleDigest;
        if (digest?.pdfUrl) {
          cachedDigest = {
            pdfUrl: digest.pdfUrl,
            expiresAt: Date.now() + 6 * 60 * 60 * 1000,
            digest,
          };
          return digest;
        }
      }
    } catch {
      // Fall through to direct parse
    } finally {
      clearTimeout(timer);
    }
  }

  return fetchAndParseChronicle();
}
