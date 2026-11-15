import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { get as blobGet, put as blobPut } from '@vercel/blob';
import type {
  DispatchHistoryEntry,
  FullDataView,
  StorageBackendStatus,
} from './types.js';

const MAX_HISTORY_ITEMS = 100;
const REDIS_HISTORY_KEY = 'cornwall:history:v1';
const REDIS_LATEST_VIEW_KEY = 'cornwall:latest-view:v1';
const BLOB_STATE_PATH = 'cornwall-dispatch/admin-state.json';

interface PersistedBundle {
  history: DispatchHistoryEntry[];
  latestView: FullDataView | null;
}

let memoryHistory: DispatchHistoryEntry[] = [];
let memoryLatestView: FullDataView | null = null;
let detectedBlobAccess: 'private' | 'public' = 'private';

function getUpstashCredentials(): { url: string; token: string } | null {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.KV_REST_API_URL ??
    ''
  )
    .trim()
    .replace(/\/+$/, '');
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    ''
  ).trim();
  if (!url || !token) return null;
  return { url, token };
}

function hasVercelBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function getStorageStatus(): StorageBackendStatus {
  const upstashRedis = Boolean(getUpstashCredentials());
  const vercelBlob = hasVercelBlobToken();

  if (upstashRedis) {
    return {
      backend: 'upstash-redis',
      persistentInCloud: true,
      configured: { upstashRedis, vercelBlob },
    };
  }
  if (vercelBlob) {
    return {
      backend: 'vercel-blob',
      persistentInCloud: true,
      configured: { upstashRedis, vercelBlob },
    };
  }
  return {
    backend: 'local-file',
    persistentInCloud: false,
    configured: { upstashRedis, vercelBlob },
  };
}

// --- Upstash Redis / Vercel KV REST helpers ---

async function upstashPipeline(
  creds: { url: string; token: string },
  commands: string[][],
): Promise<Array<{ result?: unknown; error?: string }> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${creds.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[history] Upstash Redis HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as Array<{ result?: unknown; error?: string }>;
  } catch (err) {
    console.warn('[history] Upstash Redis error:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// --- Vercel Blob helpers ---

async function readBlobBundle(): Promise<PersistedBundle | null> {
  const accessOrder: Array<'private' | 'public'> =
    detectedBlobAccess === 'private' ? ['private', 'public'] : ['public', 'private'];

  for (const access of accessOrder) {
    try {
      const res = await blobGet(BLOB_STATE_PATH, {
        access,
        useCache: false,
      });
      if (!res) return null;
      detectedBlobAccess = access;
      if (res.statusCode === 200 && res.stream) {
        const text = await new Response(res.stream).text();
        return JSON.parse(text) as PersistedBundle;
      }
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/public|private|access/i.test(msg)) {
        continue;
      }
      if (/not found|404/i.test(msg)) {
        return null;
      }
      console.warn(`[history] Vercel Blob read (${access}) failed:`, msg);
    }
  }
  return null;
}

async function writeBlobBundle(bundle: PersistedBundle): Promise<boolean> {
  const payload = JSON.stringify(bundle);
  const accessOrder: Array<'private' | 'public'> =
    detectedBlobAccess === 'private' ? ['private', 'public'] : ['public', 'private'];

  for (const access of accessOrder) {
    try {
      await blobPut(BLOB_STATE_PATH, payload, {
        access,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      detectedBlobAccess = access;
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/public|private|access/i.test(msg)) {
        continue;
      }
      console.warn(`[history] Vercel Blob write (${access}) failed:`, msg);
      return false;
    }
  }
  return false;
}

// --- Local file fallback helpers (gitignored logs/ locally, /tmp in serverless) ---

function getLocalHistoryPaths(): string[] {
  if (process.env.VERCEL) {
    return ['/tmp/cornwall-dispatch-history.json'];
  }
  return [
    resolve(process.cwd(), 'logs/dispatch-history.json'),
    '/tmp/cornwall-dispatch-history.json',
  ];
}

async function readLocalBundle(): Promise<PersistedBundle | null> {
  for (const filePath of getLocalHistoryPaths()) {
    try {
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw) as PersistedBundle;
    } catch {
      // Try next fallback path
    }
  }
  return null;
}

async function writeLocalBundle(bundle: PersistedBundle): Promise<void> {
  const payload = JSON.stringify(bundle, null, 2);
  for (const filePath of getLocalHistoryPaths()) {
    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, payload, 'utf8');
      return;
    } catch {
      // Try next fallback path
    }
  }
}

function mergeHistoryEntry(
  existing: DispatchHistoryEntry[],
  entry: DispatchHistoryEntry,
): DispatchHistoryEntry[] {
  const filtered = existing.filter((item) => item.id !== entry.id);
  return [entry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
}

export async function recordSynthesisRun(
  entry: DispatchHistoryEntry,
  fullView: FullDataView,
): Promise<void> {
  memoryLatestView = fullView;
  memoryHistory = mergeHistoryEntry(memoryHistory, entry);

  const upstash = getUpstashCredentials();
  if (upstash) {
    const ok = await upstashPipeline(upstash, [
      ['LPUSH', REDIS_HISTORY_KEY, JSON.stringify(entry)],
      ['LTRIM', REDIS_HISTORY_KEY, '0', String(MAX_HISTORY_ITEMS - 1)],
      ['SET', REDIS_LATEST_VIEW_KEY, JSON.stringify(fullView), 'EX', '604800'],
    ]);
    if (ok) return;
  }

  if (hasVercelBlobToken()) {
    const existing = await readBlobBundle();
    const history = mergeHistoryEntry(existing?.history ?? memoryHistory, entry);
    memoryHistory = history;
    const saved = await writeBlobBundle({ history, latestView: fullView });
    if (saved) return;
  }

  const localExisting = await readLocalBundle();
  const merged = mergeHistoryEntry(localExisting?.history ?? memoryHistory, entry);
  memoryHistory = merged;
  await writeLocalBundle({ history: merged, latestView: fullView });
}

export async function listHistory(limit = 50): Promise<DispatchHistoryEntry[]> {
  const cappedLimit = Math.max(1, Math.min(limit, MAX_HISTORY_ITEMS));

  const upstash = getUpstashCredentials();
  if (upstash) {
    const res = await upstashPipeline(upstash, [
      ['LRANGE', REDIS_HISTORY_KEY, '0', String(cappedLimit - 1)],
    ]);
    const rawItems = res?.[0]?.result;
    if (Array.isArray(rawItems)) {
      const parsed: DispatchHistoryEntry[] = [];
      for (const item of rawItems) {
        if (typeof item === 'string') {
          try {
            parsed.push(JSON.parse(item) as DispatchHistoryEntry);
          } catch {
            // Ignore malformed item
          }
        }
      }
      memoryHistory = parsed;
      return parsed;
    }
  }

  if (hasVercelBlobToken()) {
    const bundle = await readBlobBundle();
    if (bundle?.history) {
      memoryHistory = bundle.history;
      if (bundle.latestView && !memoryLatestView) {
        memoryLatestView = bundle.latestView;
      }
      return bundle.history.slice(0, cappedLimit);
    }
  }

  const localBundle = await readLocalBundle();
  if (localBundle?.history) {
    memoryHistory = localBundle.history;
    if (localBundle.latestView && !memoryLatestView) {
      memoryLatestView = localBundle.latestView;
    }
    return localBundle.history.slice(0, cappedLimit);
  }

  return memoryHistory.slice(0, cappedLimit);
}

export async function getLatestFullDataView(): Promise<FullDataView | null> {
  if (memoryLatestView) return memoryLatestView;

  const upstash = getUpstashCredentials();
  if (upstash) {
    const res = await upstashPipeline(upstash, [['GET', REDIS_LATEST_VIEW_KEY]]);
    const raw = res?.[0]?.result;
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw) as FullDataView;
        memoryLatestView = parsed;
        return parsed;
      } catch {
        // Ignore parse error
      }
    }
  }

  if (hasVercelBlobToken()) {
    const bundle = await readBlobBundle();
    if (bundle?.latestView) {
      memoryLatestView = bundle.latestView;
      return bundle.latestView;
    }
  }

  const localBundle = await readLocalBundle();
  if (localBundle?.latestView) {
    memoryLatestView = localBundle.latestView;
    return localBundle.latestView;
  }

  return null;
}
