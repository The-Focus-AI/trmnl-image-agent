import { GoogleGenAI } from '@google/genai';
import type { ChronicleDigest } from '../types.js';

const CHRONICLE_HOME = 'https://cornwallchronicle.org/';

// Module-level cache across warm serverless invocations / local dev
let cachedDigest: { pdfUrl: string; expiresAt: number; digest: ChronicleDigest } | null =
  null;

const CHRONICLE_SCHEMA = {
  type: 'object',
  properties: {
    issueLabel: {
      type: 'string',
      description: 'Month and year of the Cornwall Chronicle issue, e.g. NOVEMBER 2026.',
    },
    events: {
      type: 'array',
      description:
        'Community events, talks, fairs, library programs, concerts, walks, and town-wide meetings (exclude routine zoning/wetlands/board administrative meetings). Include both November and Save-the-Date December items.',
      items: {
        type: 'object',
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
        properties: {
          title: { type: 'string', description: 'Short title (max 40 chars).' },
          snippet: {
            type: 'string',
            description: 'Vivid 1-2 sentence takeaway (max 165 chars).',
          },
          byline: { type: 'string', description: 'Author name if credited.' },
        },
        required: ['title', 'snippet'],
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

async function fetchPdfAsBase64(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Guard against huge PDFs (>20MB)
    if (buf.byteLength > 20 * 1024 * 1024) return null;
    return buf.toString('base64');
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAndParseChronicle(): Promise<ChronicleDigest | null> {
  const { mainPdfUrl } = await discoverLatestChroniclePdfUrls();
  if (!mainPdfUrl) return cachedDigest?.digest ?? null;

  if (
    cachedDigest &&
    cachedDigest.pdfUrl === mainPdfUrl &&
    cachedDigest.expiresAt > Date.now()
  ) {
    return cachedDigest.digest;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const pdfBase64 = await fetchPdfAsBase64(mainPdfUrl);
  if (!pdfBase64) return cachedDigest?.digest ?? null;

  try {
    const client = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    const interaction = await client.interactions.create({
      model: 'gemini-4-hydrogen',
      store: false,
      input: [
        {
          type: 'document',
          data: pdfBase64,
          mime_type: 'application/pdf',
        },
        {
          type: 'text',
          text: `Extract structured community calendar events (including flyers/inserts at the back of the PDF and Save-the-Dates), Cornwall Briefs & local news highlights, and Nature Notes / local history lore from this issue of the Cornwall Chronicle (Cornwall, CT). Exclude dry municipal committee meetings (ZBA, Inland Wetlands, P&Z routine sessions) unless it is a major Town Meeting or public festival. Use exact YYYY-MM-DD dates whenever a specific calendar date is given.`,
        },
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: CHRONICLE_SCHEMA,
      },
    });

    const rawText = interaction.output_text;
    if (!rawText) return cachedDigest?.digest ?? null;
    const parsed = JSON.parse(rawText);

    const digest: ChronicleDigest = {
      issueLabel: String(parsed.issueLabel ?? 'CURRENT ISSUE'),
      pdfUrl: mainPdfUrl,
      fetchedAt: new Date().toISOString(),
      events: Array.isArray(parsed.events) ? parsed.events : [],
      briefs: Array.isArray(parsed.briefs) ? parsed.briefs : [],
      natureAndLore: Array.isArray(parsed.natureAndLore) ? parsed.natureAndLore : [],
    };

    cachedDigest = {
      pdfUrl: mainPdfUrl,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      digest,
    };

    return digest;
  } catch (err) {
    console.error('[chronicle] Gemini PDF parse failed:', err);
    return cachedDigest?.digest ?? null;
  }
}

/**
 * Fetch Chronicle digest via the Vercel 24h CDN-cached /api/chronicle endpoint when deployed,
 * falling back to direct in-process parsing in local dev or on cache warm.
 */
export async function getChronicleDigest(requestOrigin?: string): Promise<ChronicleDigest | null> {
  if (
    cachedDigest &&
    cachedDigest.expiresAt > Date.now()
  ) {
    return cachedDigest.digest;
  }

  if (requestOrigin && !requestOrigin.includes('localhost') && !requestOrigin.includes('127.0.0.1')) {
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
