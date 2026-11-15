import type { AdminDataPayload, DispatchHistoryEntry } from '../types.js';
import { escapeHtml, renderCoveredBridgeEmblemSvg } from './svg.js';

function formatCornwallTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(ms));
}

function pctLabel(val: number | undefined): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  return `${Math.round(val * 100)}%`;
}

function renderStorageBadge(storage: AdminDataPayload['storage']): string {
  if (storage.backend === 'upstash-redis') {
    return `<span class="badge badge-ok">UPSTASH REDIS (PERSISTENT)</span>`;
  }
  if (storage.backend === 'vercel-blob') {
    return `<span class="badge badge-ok">VERCEL BLOB (PERSISTENT)</span>`;
  }
  return `<span class="badge badge-warn">LOCAL FILE FALLBACK</span>`;
}

function renderTriggerBadge(trigger: DispatchHistoryEntry['trigger']): string {
  switch (trigger) {
    case 'cron':
      return `<span class="badge badge-ink">CRON</span>`;
    case 'admin-refresh':
      return `<span class="badge badge-accent">ADMIN REFRESH</span>`;
    default:
      return `<span class="badge badge-muted">LIVE MISS</span>`;
  }
}

export function renderAdminHtml(
  payload: AdminDataPayload,
  options?: { activeDaypartOverride?: string | null },
): string {
  const { storage, currentView, history } = payload;
  const { edition, parallel, eligibleWindows, upcomingChronicleEvents } = currentView;
  const chronicleDigest = parallel.chronicle.digest;
  const upcomingKeySet = new Set(
    upcomingChronicleEvents.map((e) => `${e.date}:${e.title}`),
  );

  const extractedUrlsSet = new Set(parallel.extract.results.map((r) => r.url));
  const failedUrlMap = new Map(
    parallel.extract.failedResults.map((f) => [f.url, f.error]),
  );

  const dayparts = ['morning', 'midday', 'evening', 'weekend'] as const;
  const activeDayOverride = options?.activeDaypartOverride ?? '';

  const probRows = [
    {
      key: 'hasUrgentBanner',
      label: 'Urgent Advisory / NWS Warning / Closure',
      prob: parallel.decisions.probabilities.urgent,
      threshold: 0.75,
      active: parallel.decisions.hasUrgentBanner,
    },
    {
      key: 'isMohawkSkiOpen',
      label: 'Mohawk Mountain Lift-Served Trails Open',
      prob: parallel.decisions.probabilities.skiOpen,
      threshold: 0.65,
      active: parallel.decisions.isMohawkSkiOpen,
    },
    {
      key: 'hasSchoolDisruption',
      label: 'Region 1 School Closure / Delay',
      prob: parallel.decisions.probabilities.schoolDisruption,
      threshold: 0.7,
      active: parallel.decisions.hasSchoolDisruption,
    },
  ];

  const archetypes = ['dispatch', 'broadsheet', 'handbill', 'almanac', 'poster'] as const;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Admin &amp; Full Data View — The Cornwall Dispatch</title>
  <style>
    :root {
      --paper: #f6f3eb;
      --card: #ffffff;
      --ink: #141413;
      --muted: #57554f;
      --border: #141413;
      --border-soft: #d5cfc2;
      --accent: #1d4d3c;
      --accent-bg: #e5f0eb;
      --warn: #7c4a03;
      --warn-bg: #fef3d6;
      --alert: #8c1d18;
      --alert-bg: #fde8e7;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --serif: Georgia, "Times New Roman", serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: var(--sans);
      font-size: 14px;
      line-height: 1.48;
    }
    a { color: var(--ink); }
    a:hover { color: var(--accent); }
    .topbar {
      background: var(--ink);
      color: #fff;
      padding: 12px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 30;
      border-bottom: 3px solid #000;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand svg {
      background: #fff;
      padding: 2px 4px;
      border-radius: 2px;
    }
    .brand-title {
      font-family: var(--serif);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .brand-sub {
      font-family: var(--mono);
      font-size: 11px;
      color: #ccc;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .nav-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .nav-link, .btn {
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      padding: 6px 11px;
      border: 1.5px solid #555;
      color: #fff;
      background: #222;
      border-radius: 3px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .nav-link:hover, .btn:hover {
      background: #383838;
      color: #fff;
      border-color: #888;
    }
    .btn-primary {
      background: #fff;
      color: #000;
      border-color: #fff;
      font-weight: 700;
    }
    .btn-primary:hover {
      background: #e3dfd5;
      color: #000;
    }
    .container {
      max-width: 1380px;
      margin: 0 auto;
      padding: 20px 24px 64px;
    }
    .subnav {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--card);
      border: 2px solid var(--border);
      margin-bottom: 18px;
    }
    .jump-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      font-family: var(--mono);
      font-size: 12px;
    }
    .jump-links a {
      text-decoration: none;
      padding: 4px 9px;
      background: var(--paper);
      border: 1px solid var(--border-soft);
      font-weight: 600;
    }
    .jump-links a:hover {
      border-color: var(--ink);
    }
    .filter-box {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 420px;
    }
    .filter-input {
      width: 100%;
      padding: 6px 10px;
      font-family: var(--mono);
      font-size: 12px;
      border: 1.5px solid var(--border);
      background: #fff;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
      gap: 14px;
      margin-bottom: 22px;
    }
    .kpi-card {
      background: var(--card);
      border: 2px solid var(--border);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .kpi-label {
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .kpi-value {
      font-family: var(--serif);
      font-size: 22px;
      font-weight: 700;
      line-height: 1.15;
    }
    .kpi-meta {
      font-family: var(--mono);
      font-size: 11.5px;
      color: var(--muted);
    }
    .badge {
      display: inline-block;
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 6px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border-radius: 2px;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .badge-ok { background: var(--accent-bg); color: var(--accent); border-color: #9ec5b5; }
    .badge-warn { background: var(--warn-bg); color: var(--warn); border-color: #e6c677; }
    .badge-alert { background: var(--alert-bg); color: var(--alert); border-color: #e29d9a; }
    .badge-ink { background: var(--ink); color: #fff; }
    .badge-accent { background: var(--accent); color: #fff; }
    .badge-muted { background: #eae6dc; color: #3d3b36; border-color: #ccc6b8; }

    .section {
      background: var(--card);
      border: 2px solid var(--border);
      margin-bottom: 22px;
    }
    .section-header {
      padding: 12px 18px;
      border-bottom: 2px solid var(--border);
      background: #efebe0;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .section-title {
      margin: 0;
      font-family: var(--serif);
      font-size: 19px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-body {
      padding: 16px 18px;
    }
    .notice-bar {
      padding: 10px 14px;
      background: var(--warn-bg);
      border: 1px solid #e6c677;
      color: #5c3702;
      font-family: var(--mono);
      font-size: 12px;
      margin-bottom: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      text-align: left;
      vertical-align: top;
      padding: 9px 10px;
      border-bottom: 1px solid var(--border-soft);
    }
    th {
      font-family: var(--mono);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      background: #faf8f3;
      border-bottom: 1.5px solid var(--border);
    }
    tr:last-child td { border-bottom: none; }
    .table-scroll {
      overflow-x: auto;
    }
    .two-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));
      gap: 18px;
    }
    .three-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
      gap: 14px;
    }
    .item-card {
      border: 1.5px solid var(--border-soft);
      padding: 12px 14px;
      background: #fcfbf8;
    }
    .item-card + .item-card {
      margin-top: 10px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 6px;
    }
    .item-title {
      font-weight: 700;
      font-size: 14.5px;
      line-height: 1.25;
    }
    .item-url {
      font-family: var(--mono);
      font-size: 11.5px;
      color: var(--muted);
      word-break: break-all;
      display: block;
      margin-bottom: 8px;
    }
    .excerpt-list {
      margin: 0;
      padding-left: 18px;
    }
    .excerpt-list li {
      margin-bottom: 6px;
      font-size: 13px;
      color: #222;
    }
    .excerpt-list li:last-child { margin-bottom: 0; }
    .meta-kv {
      font-family: var(--mono);
      font-size: 12px;
      background: #f5f2ea;
      border: 1px solid var(--border-soft);
      padding: 9px 12px;
      margin-bottom: 12px;
    }
    .prob-row {
      margin-bottom: 10px;
    }
    .prob-top {
      display: flex;
      justify-content: space-between;
      font-family: var(--mono);
      font-size: 12px;
      margin-bottom: 4px;
    }
    .prob-track {
      height: 10px;
      background: #e7e2d6;
      border: 1px solid #bdb6a5;
      position: relative;
    }
    .prob-fill {
      height: 100%;
      background: var(--ink);
    }
    .prob-thresh {
      position: absolute;
      top: -3px;
      bottom: -3px;
      width: 2px;
      background: var(--alert);
    }
    details {
      margin-top: 10px;
      border: 1px solid var(--border-soft);
      background: #faf8f3;
    }
    summary {
      cursor: pointer;
      padding: 8px 12px;
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 700;
    }
    pre {
      margin: 0;
      padding: 12px;
      overflow-x: auto;
      font-family: var(--mono);
      font-size: 11.5px;
      line-height: 1.4;
      background: #171716;
      color: #f1efe8;
      max-height: 460px;
    }
    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .pill-link {
      font-family: var(--mono);
      font-size: 11px;
      padding: 3px 8px;
      border: 1px solid var(--border);
      text-decoration: none;
      background: #fff;
    }
    .pill-link.active {
      background: var(--ink);
      color: #fff;
    }
    .hidden-by-filter {
      display: none !important;
    }
    @media (max-width: 760px) {
      .two-col, .three-col { grid-template-columns: 1fr; }
      .topbar, .container { padding-left: 14px; padding-right: 14px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">
      ${renderCoveredBridgeEmblemSvg(54, 24)}
      <div>
        <div class="brand-title">The Cornwall Dispatch — Pressroom Admin</div>
        <div class="brand-sub">Full Parallel Extraction Inspector &amp; Run History</div>
      </div>
    </div>
    <div class="nav-actions">
      <a class="nav-link" href="/?frame=1">1-Bit Simulator</a>
      <a class="nav-link" href="/">Raw 800×480</a>
      <a class="nav-link" href="/admin?format=json">Admin JSON</a>
      <a class="nav-link" href="/api/state">Edition JSON</a>
      <a class="nav-link" href="/api/chronicle">Chronicle JSON</a>
      <form method="POST" action="/api/admin" style="margin:0;display:inline-flex;gap:6px;align-items:center;" onsubmit="const b=this.querySelector('button');if(b){b.disabled=true;b.textContent='Extracting…';}">
        <input type="hidden" name="refresh" value="1" />
        ${activeDayOverride ? `<input type="hidden" name="daypart" value="${escapeHtml(activeDayOverride)}" />` : ''}
        <label style="font-family:var(--mono);font-size:11px;display:inline-flex;align-items:center;gap:4px;color:#ddd;cursor:pointer;" title="Also clear cached Cornwall Chronicle PDF digest and re-parse">
          <input type="checkbox" name="refreshChronicle" value="1" /> +PDF
        </label>
        <button type="submit" class="btn btn-primary">&#x21bb; Re-Extract &amp; Synthesize</button>
      </form>
    </div>
  </header>

  <main class="container">
    ${
      !storage.persistentInCloud
        ? `<div class="notice-bar">
            <strong>History Store Notice:</strong> Running on local file fallback (<code>logs/dispatch-history.json</code> / <code>/tmp</code>). To persist history across serverless cold starts on Vercel, provision Upstash Redis (<code>UPSTASH_REDIS_REST_URL</code> + <code>UPSTASH_REDIS_REST_TOKEN</code>) or Vercel Blob (<code>BLOB_READ_WRITE_TOKEN</code>).
          </div>`
        : ''
    }

    <div class="subnav">
      <div class="jump-links">
        <strong>Jump:</strong>
        <a href="#history">History (${history.length})</a>
        <a href="#decisions">Decisions Router</a>
        <a href="#extract">Web Extract (${parallel.extract.results.length})</a>
        <a href="#search">Web Search (${parallel.search.results.length})</a>
        <a href="#chronicle">Chronicle PDF (${chronicleDigest?.events.length ?? 0} events)</a>
        <a href="#copy">Synthesized Copy</a>
        <a href="#upstream">Weather / River / Almanac</a>
        <a href="#raw-json">Raw JSON</a>
      </div>
      <div class="filter-box">
        <input
          id="admin-filter"
          class="filter-input"
          type="search"
          placeholder="Filter extracted pages, search hits, Chronicle events &amp; briefs…"
          aria-label="Filter extracted items"
        />
      </div>
    </div>

    <!-- KPI Summary Strip -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">
          <span>Parallel Pipeline</span>
          ${
            currentView.parallelConfigured
              ? `<span class="badge badge-ok">API KEY CONFIGURED</span>`
              : `<span class="badge badge-warn">NO API KEY (FALLBACK)</span>`
          }
        </div>
        <div class="kpi-value">${currentView.totalElapsedMs.toLocaleString()} ms</div>
        <div class="kpi-meta">
          Captured ${escapeHtml(formatCornwallTimestamp(currentView.capturedAt))} ET &bull;
          Decisions: <strong>${escapeHtml(parallel.decisions.provider)}</strong> (${parallel.decisions.elapsedMs ?? 0}ms) &bull;
          Copy: <strong>${escapeHtml(parallel.copySynthesis.provider)}</strong> (${parallel.copySynthesis.elapsedMs}ms)
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">
          <span>Parallel Extracted Volume</span>
          <span class="badge badge-muted">${escapeHtml(edition.routingMeta.chronicleIssue)}</span>
        </div>
        <div class="kpi-value">
          ${parallel.extract.results.length} Pages &bull; ${parallel.search.results.length} Hits
        </div>
        <div class="kpi-meta">
          Chronicle: <strong>${chronicleDigest?.events.length ?? 0}</strong> events (${upcomingChronicleEvents.length} upcoming),
          <strong>${chronicleDigest?.briefs.length ?? 0}</strong> briefs,
          <strong>${chronicleDigest?.natureAndLore.length ?? 0}</strong> lore notes
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">
          <span>Active Storefront Edition</span>
          <span class="badge badge-ink">${escapeHtml(edition.daypart.toUpperCase())}</span>
        </div>
        <div class="kpi-value">Lead: ${escapeHtml(currentView.leadArchetype)}</div>
        <div class="kpi-meta">
          Spotlight: <strong>${escapeHtml(edition.seasonalSpotlight.windowId)}</strong>
          ${edition.alertBanner ? ` &bull; <span class="badge badge-alert">ALERT ACTIVE</span>` : ''}
        </div>
        <div class="pill-row">
          ${archetypes
            .map(
              (a) =>
                `<a class="pill-link ${a === edition.archetype ? 'active' : ''}" href="/?frame=1&amp;archetype=${a}">${a}</a>`,
            )
            .join('')}
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">
          <span>History &amp; Daypart Inspect</span>
          ${renderStorageBadge(storage)}
        </div>
        <div class="kpi-value">${history.length} Recorded Runs</div>
        <div class="kpi-meta">Inspect Daypart:</div>
        <div class="pill-row">
          <a class="pill-link ${!activeDayOverride ? 'active' : ''}" href="/admin">Auto</a>
          ${dayparts
            .map(
              (d) =>
                `<a class="pill-link ${activeDayOverride === d ? 'active' : ''}" href="/admin?daypart=${d}">${d}</a>`,
            )
            .join('')}
        </div>
      </div>
    </section>

    <!-- 1. HIGH-LEVEL RUN HISTORY -->
    <section id="history" class="section">
      <div class="section-header">
        <h2 class="section-title">
          High-Level Run History
          <span class="badge badge-muted">LAST ${history.length} RUNS</span>
        </h2>
        <div style="font-family:var(--mono);font-size:12px;color:var(--muted);">
          Backend: <strong>${escapeHtml(storage.backend)}</strong>
          (Redis: ${storage.configured.upstashRedis ? 'yes' : 'no'}, Blob: ${storage.configured.vercelBlob ? 'yes' : 'no'})
        </div>
      </div>
      <div class="section-body" style="padding:0;">
        ${
          history.length === 0
            ? `<div style="padding:18px;color:var(--muted);font-family:var(--mono);">No synthesis runs recorded yet. Click "Re-Extract &amp; Synthesize" above to record one.</div>`
            : `<div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Time (ET)</th>
                      <th>Trigger</th>
                      <th>Edition</th>
                      <th>Lead / Spotlight</th>
                      <th>Published Lead Headline</th>
                      <th>Parallel Extraction</th>
                      <th>Sky &amp; River</th>
                      <th>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${history
                      .map(
                        (h) => `<tr class="filterable-item">
                          <td style="font-family:var(--mono);font-size:12px;white-space:nowrap;">${escapeHtml(formatCornwallTimestamp(h.timestamp))}</td>
                          <td>${renderTriggerBadge(h.trigger)}</td>
                          <td style="font-family:var(--mono);font-size:12px;white-space:nowrap;">
                            <strong>${escapeHtml(h.daypart.toUpperCase())}</strong><br/>
                            <span style="color:var(--muted);">${escapeHtml(h.dateLabel)}</span>
                          </td>
                          <td style="font-family:var(--mono);font-size:12px;">
                            <span class="badge badge-ink">${escapeHtml(h.leadArchetype)}</span>
                            <div style="margin-top:3px;color:var(--muted);">${escapeHtml(h.spotlightId)}</div>
                          </td>
                          <td>
                            <div style="font-weight:700;">${escapeHtml(h.headline)}</div>
                            ${
                              h.alertBanner
                                ? `<div style="margin-top:3px;"><span class="badge badge-alert">${escapeHtml(h.alertBanner)}</span></div>`
                                : ''
                            }
                          </td>
                          <td style="font-family:var(--mono);font-size:11.5px;">
                            <div>
                              <span class="badge ${h.decisionProvider === 'parallel' ? 'badge-ok' : 'badge-warn'}">DEC:${escapeHtml(h.decisionProvider)}</span>
                              <span class="badge ${h.copyProvider === 'parallel' ? 'badge-ok' : 'badge-warn'}">COPY:${escapeHtml(h.copyProvider)}</span>
                            </div>
                            <div style="margin-top:4px;color:var(--muted);">
                              ${h.counts.extractedPages} pg &bull; ${h.counts.searchHits} srch &bull; ${h.counts.chronicleEvents} ev / ${h.counts.chronicleBriefs} brf
                            </div>
                          </td>
                          <td style="font-family:var(--mono);font-size:11.5px;">
                            <div>${escapeHtml(h.weatherSummary)}</div>
                            <div style="color:var(--muted);">${escapeHtml(h.riverSummary)}</div>
                          </td>
                          <td style="font-family:var(--mono);font-size:12px;white-space:nowrap;">${h.elapsedMs.toLocaleString()} ms</td>
                        </tr>`,
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
        }
      </div>
    </section>

    <!-- 2. PARALLEL /v1/decisions ROUTING & CALIBRATED CHECKS -->
    <section id="decisions" class="section">
      <div class="section-header">
        <h2 class="section-title">
          Parallel <code>/v1/decisions</code> — Editorial Router &amp; Live Checks
          <span class="badge ${parallel.decisions.provider === 'parallel' ? 'badge-ok' : 'badge-warn'}">${escapeHtml(parallel.decisions.provider)}</span>
        </h2>
        <span style="font-family:var(--mono);font-size:12px;color:var(--muted);">${parallel.decisions.elapsedMs ?? 0} ms</span>
      </div>
      <div class="section-body">
        <div class="two-col">
          <div>
            <div class="meta-kv">
              <div><strong>Chosen Lead Archetype:</strong> <code>${escapeHtml(parallel.decisions.archetype)}</code> (Currently rotating slot: <code>${escapeHtml(edition.archetype)}</code>)</div>
              <div><strong>Chosen Seasonal Spotlight:</strong> <code>${escapeHtml(parallel.decisions.spotlightId)}</code></div>
              <div><strong>Eligible Calendar Windows Passed In:</strong> ${eligibleWindows.map((w) => `<code>${escapeHtml(w.id)}</code>`).join(', ')}</div>
            </div>

            ${probRows
              .map((row) => {
                const pct =
                  typeof row.prob === 'number' && Number.isFinite(row.prob)
                    ? Math.max(0, Math.min(100, Math.round(row.prob * 100)))
                    : 0;
                const threshPct = Math.round(row.threshold * 100);
                return `<div class="prob-row">
                  <div class="prob-top">
                    <span><strong>${escapeHtml(row.label)}</strong> (<code>${escapeHtml(row.key)}</code>)</span>
                    <span>
                      <strong>${pctLabel(row.prob)}</strong> (threshold ${threshPct}%)
                      ${row.active ? `<span class="badge badge-alert">TRUE</span>` : `<span class="badge badge-muted">FALSE</span>`}
                    </span>
                  </div>
                  <div class="prob-track">
                    <div class="prob-fill" style="width:${pct}%;"></div>
                    <div class="prob-thresh" style="left:${threshPct}%;" title="Threshold ${threshPct}%"></div>
                  </div>
                </div>`;
              })
              .join('')}
          </div>

          <div>
            <div style="font-family:var(--mono);font-size:12px;font-weight:700;margin-bottom:8px;">
              DECISIONS CITATIONS (${parallel.decisions.citations.length})
            </div>
            ${
              parallel.decisions.citations.length === 0
                ? `<div style="color:var(--muted);font-family:var(--mono);font-size:12px;">No separate citations returned by <code>/v1/decisions</code> on this run.</div>`
                : parallel.decisions.citations
                    .map(
                      (c) => `<div class="item-card filterable-item">
                        <div class="item-title">${escapeHtml(c.title)}</div>
                        ${c.url ? `<a class="item-url" href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.url)}</a>` : ''}
                        ${c.excerpt ? `<div style="font-size:13px;">${escapeHtml(c.excerpt)}</div>` : ''}
                      </div>`,
                    )
                    .join('')
            }

            ${
              parallel.decisions.rawAnswers
                ? `<details>
                    <summary>Inspect Raw /v1/decisions Answers Payload</summary>
                    <pre>${escapeHtml(JSON.stringify(parallel.decisions.rawAnswers, null, 2))}</pre>
                  </details>`
                : ''
            }
          </div>
        </div>
      </div>
    </section>

    <!-- 3. PARALLEL /v1/extract & /v1/search -->
    <div class="two-col" style="margin-bottom:22px;">
      <section id="extract" class="section" style="margin-bottom:0;">
        <div class="section-header">
          <h2 class="section-title">
            Parallel <code>/v1/extract</code> — Cornwall Web Pages
            <span class="badge ${parallel.extract.ok ? 'badge-ok' : 'badge-warn'}">${parallel.extract.results.length} / ${parallel.extract.urls.length} URLS</span>
          </h2>
          <span style="font-family:var(--mono);font-size:12px;color:var(--muted);">${parallel.extract.elapsedMs} ms</span>
        </div>
        <div class="section-body">
          <div class="meta-kv">
            <div><strong>Objective:</strong> ${escapeHtml(parallel.extract.objective)}</div>
            <div style="margin-top:6px;">
              <strong>Target URLs:</strong>
              <div class="pill-row">
                ${parallel.extract.urls
                  .map((u) => {
                    const ok = extractedUrlsSet.has(u);
                    const err = failedUrlMap.get(u);
                    const cls = ok ? 'badge-ok' : err ? 'badge-alert' : 'badge-muted';
                    let host = u;
                    try {
                      host = new URL(u).hostname.replace(/^www\./, '');
                    } catch {
                      // keep raw
                    }
                    return `<span class="badge ${cls}" title="${escapeHtml(err ? `${u} — ${err}` : u)}">${escapeHtml(host)}</span>`;
                  })
                  .join(' ')}
              </div>
            </div>
          </div>

          ${
            parallel.extract.failedResults.length > 0
              ? `<div style="margin-bottom:12px;">
                  ${parallel.extract.failedResults
                    .map(
                      (f) =>
                        `<div style="font-family:var(--mono);font-size:11.5px;color:var(--alert);margin-bottom:4px;">&#x26a0; ${escapeHtml(f.url)} — ${escapeHtml(f.error)}</div>`,
                    )
                    .join('')}
                </div>`
              : ''
          }

          ${
            parallel.extract.results.length === 0
              ? `<div style="color:var(--muted);font-family:var(--mono);font-size:12px;">No live page excerpts returned (check PARALLEL_API_KEY or click Re-Extract).</div>`
              : parallel.extract.results
                  .map(
                    (page) => `<article class="item-card filterable-item">
                      <div class="item-header">
                        <div class="item-title">${escapeHtml(page.title)}</div>
                        ${page.publishedAt ? `<span class="badge badge-muted">${escapeHtml(page.publishedAt)}</span>` : ''}
                      </div>
                      <a class="item-url" href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.url)}</a>
                      ${
                        page.excerpts.length > 0
                          ? `<ul class="excerpt-list">
                              ${page.excerpts.map((ex) => `<li>${escapeHtml(ex)}</li>`).join('')}
                            </ul>`
                          : page.fullContentPreview
                            ? `<div style="font-size:13px;white-space:pre-wrap;">${escapeHtml(page.fullContentPreview)}</div>`
                            : `<div style="color:var(--muted);font-size:12px;">(Empty excerpt array)</div>`
                      }
                    </article>`,
                  )
                  .join('')
          }
        </div>
      </section>

      <section id="search" class="section" style="margin-bottom:0;">
        <div class="section-header">
          <h2 class="section-title">
            Parallel <code>/v1/search</code> — Local Web Search
            <span class="badge ${parallel.search.ok ? 'badge-ok' : 'badge-warn'}">${parallel.search.results.length} HITS</span>
          </h2>
          <span style="font-family:var(--mono);font-size:12px;color:var(--muted);">${parallel.search.elapsedMs} ms</span>
        </div>
        <div class="section-body">
          <div class="meta-kv">
            <div><strong>Objective:</strong> ${escapeHtml(parallel.search.objective)}</div>
            <div style="margin-top:6px;">
              <strong>Queries:</strong>
              ${parallel.search.searchQueries.map((q) => `<div>&bull; <code>${escapeHtml(q)}</code></div>`).join('')}
            </div>
          </div>

          ${
            parallel.search.results.length === 0
              ? `<div style="color:var(--muted);font-family:var(--mono);font-size:12px;">No search results returned on this run.</div>`
              : parallel.search.results
                  .map(
                    (hit) => `<article class="item-card filterable-item">
                      <div class="item-header">
                        <div class="item-title">${escapeHtml(hit.title)}</div>
                        ${hit.publishedAt ? `<span class="badge badge-muted">${escapeHtml(hit.publishedAt)}</span>` : ''}
                      </div>
                      <a class="item-url" href="${escapeHtml(hit.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(hit.url)}</a>
                      ${
                        hit.excerpts.length > 0
                          ? `<ul class="excerpt-list">
                              ${hit.excerpts.map((ex) => `<li>${escapeHtml(ex)}</li>`).join('')}
                            </ul>`
                          : `<div style="color:var(--muted);font-size:12px;">(No excerpts)</div>`
                      }
                    </article>`,
                  )
                  .join('')
          }
        </div>
      </section>
    </div>

    <!-- 4. CORNWALL CHRONICLE MONTHLY PDF EXTRACTION -->
    <section id="chronicle" class="section">
      <div class="section-header">
        <h2 class="section-title">
          Monthly <em>Cornwall Chronicle</em> PDF Extraction
          <span class="badge badge-ink">${escapeHtml(chronicleDigest?.issueLabel ?? 'UNAVAILABLE')}</span>
          ${parallel.chronicle.fromCache ? `<span class="badge badge-muted">CACHED</span>` : `<span class="badge badge-ok">FRESH PARSE</span>`}
        </h2>
        <span style="font-family:var(--mono);font-size:12px;color:var(--muted);">
          ${parallel.chronicle.combinedChars > 0 ? `${parallel.chronicle.combinedChars.toLocaleString()} chars / ${parallel.chronicle.chunkCount} chunks &bull; ` : ''}
          ${parallel.chronicle.elapsedMs} ms
        </span>
      </div>
      <div class="section-body">
        <div class="meta-kv">
          <div>
            <strong>Main Issue PDF:</strong>
            ${
              parallel.chronicle.discoveredMainPdfUrl || chronicleDigest?.pdfUrl
                ? `<a href="${escapeHtml(parallel.chronicle.discoveredMainPdfUrl ?? chronicleDigest?.pdfUrl ?? '')}" target="_blank" rel="noopener noreferrer">${escapeHtml(parallel.chronicle.discoveredMainPdfUrl ?? chronicleDigest?.pdfUrl ?? '')}</a>`
                : 'None discovered'
            }
          </div>
          ${
            parallel.chronicle.discoveredInsertPdfUrls.length > 0
              ? `<div style="margin-top:4px;"><strong>Insert PDFs:</strong> ${parallel.chronicle.discoveredInsertPdfUrls
                  .map(
                    (u) =>
                      `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer">${escapeHtml(u)}</a>`,
                  )
                  .join(' , ')}</div>`
              : ''
          }
          ${
            parallel.chronicle.sourcePdfs.length > 0
              ? `<div style="margin-top:4px;"><strong>Extraction Method per PDF:</strong> ${parallel.chronicle.sourcePdfs
                  .map(
                    (s) =>
                      `<code>${escapeHtml(s.url.split('/').pop() ?? s.url)}: ${escapeHtml(s.method)}</code> (${s.charCount.toLocaleString()} chars)`,
                  )
                  .join(' &bull; ')}</div>`
              : ''
          }
          ${
            parallel.chronicle.pageRoutingSummary
              ? `<div style="margin-top:4px;"><strong>Smart Page Routing:</strong> ${escapeHtml(parallel.chronicle.pageRoutingSummary)}</div>`
              : ''
          }
          ${
            (parallel.chronicle.parallelExtractErrors?.length ?? 0) > 0
              ? `<div style="margin-top:4px;color:var(--warn);"><strong>Origin WAF Note:</strong> ${(parallel.chronicle.parallelExtractErrors ?? [])
                  .map(
                    (e) =>
                      `${escapeHtml(e.url.split('/').pop() ?? e.url)} returned <code>${escapeHtml(e.error)}</code> to Parallel crawler &rarr; handled via page-aware local fallback`,
                  )
                  .join('; ')}</div>`
              : ''
          }
        </div>

        ${
          (parallel.chronicle.parallelExtractItems?.length ?? 0) > 0
            ? `<details style="margin-bottom:14px;">
                <summary>Direct Parallel /v1/extract PDF Markdown &amp; Excerpts (${parallel.chronicle.parallelExtractItems?.length ?? 0} PDF)</summary>
                <div style="padding:12px;">
                  ${(parallel.chronicle.parallelExtractItems ?? [])
                    .map(
                      (item) => `<div class="item-card filterable-item">
                        <div class="item-title">${escapeHtml(item.title)}</div>
                        <a class="item-url" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>
                        ${
                          item.excerpts.length > 0
                            ? `<ul class="excerpt-list">${item.excerpts
                                .map((ex) => `<li style="white-space:pre-wrap;">${escapeHtml(ex)}</li>`)
                                .join('')}</ul>`
                            : item.fullContentPreview
                              ? `<div style="white-space:pre-wrap;font-size:12.5px;">${escapeHtml(item.fullContentPreview)}</div>`
                              : ''
                        }
                      </div>`,
                    )
                    .join('')}
                </div>
              </details>`
            : ''
        }

        ${
          !chronicleDigest
            ? `<div style="color:var(--muted);font-family:var(--mono);">No Chronicle digest available. Ensure <code>PARALLEL_API_KEY</code> is set and click Re-Extract (+PDF).</div>`
            : `
              <h3 style="font-family:var(--serif);margin:14px 0 8px;">Extracted Community Calendar Events (${chronicleDigest.events.length} total, ${upcomingChronicleEvents.length} upcoming)</h3>
              <div class="table-scroll" style="border:1px solid var(--border-soft);margin-bottom:18px;">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Event Title</th>
                      <th>Location</th>
                      <th>Extracted Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${chronicleDigest.events
                      .map((ev) => {
                        const isUpcoming = upcomingKeySet.has(`${ev.date}:${ev.title}`);
                        return `<tr class="filterable-item">
                          <td style="white-space:nowrap;">
                            ${isUpcoming ? `<span class="badge badge-ok">UPCOMING</span>` : `<span class="badge badge-muted">PAST</span>`}
                            ${ev.isMajor ? `<span class="badge badge-ink">MAJOR</span>` : ''}
                          </td>
                          <td style="font-family:var(--mono);font-size:12px;white-space:nowrap;">${escapeHtml(ev.date)}</td>
                          <td style="font-family:var(--mono);font-size:12px;white-space:nowrap;">${escapeHtml(ev.time)}</td>
                          <td style="font-weight:700;">${escapeHtml(ev.title)}</td>
                          <td>${escapeHtml(ev.location)}</td>
                          <td>${escapeHtml(ev.summary)}</td>
                        </tr>`;
                      })
                      .join('')}
                  </tbody>
                </table>
              </div>

              <div class="two-col">
                <div>
                  <h3 style="font-family:var(--serif);margin:0 0 8px;">Extracted Civic &amp; Town Briefs (${chronicleDigest.briefs.length})</h3>
                  ${chronicleDigest.briefs
                    .map((b) => {
                      const d = (b.eventDate ?? '').trim();
                      const isExpiredNotice =
                        !b.isRetrospective &&
                        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
                        d < edition.almanac.dateIso;
                      return `<div class="item-card filterable-item">
                        <div class="item-header">
                          <div class="item-title">${escapeHtml(b.headline)}</div>
                          <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
                            ${d ? `<span class="badge badge-muted">${escapeHtml(d)}</span>` : ''}
                            ${
                              isExpiredNotice
                                ? `<span class="badge badge-muted" title="Dated notice prior to ${escapeHtml(edition.almanac.dateIso)} — filtered out of synthesis">PAST DATE</span>`
                                : b.isRetrospective
                                  ? `<span class="badge badge-warn" title="Prior-year lookback — ranked below current-month briefs &amp; requires explicit year attribution">RETROSPECTIVE</span>`
                                  : `<span class="badge badge-ok">CURRENT</span>`
                            }
                          </div>
                        </div>
                        <div style="margin-top:4px;font-size:13px;">${escapeHtml(b.detail)}</div>
                      </div>`;
                    })
                    .join('')}
                </div>
                <div>
                  <h3 style="font-family:var(--serif);margin:0 0 8px;">Extracted Nature Notes &amp; Local Lore (${chronicleDigest.natureAndLore.length})</h3>
                  ${chronicleDigest.natureAndLore
                    .map(
                      (n) => `<div class="item-card filterable-item">
                        <div class="item-header">
                          <div class="item-title">${escapeHtml(n.title)}</div>
                          ${n.byline ? `<span class="badge badge-muted">${escapeHtml(n.byline)}</span>` : ''}
                        </div>
                        <div style="font-size:13px;">${escapeHtml(n.snippet)}</div>
                      </div>`,
                    )
                    .join('')}
                </div>
              </div>
            `
        }
      </div>
    </section>

    <!-- 5. PARALLEL /v1beta/chat/completions SYNTHESIZED EDITION COPY -->
    <section id="copy" class="section">
      <div class="section-header">
        <h2 class="section-title">
          Parallel <code>/v1beta/chat/completions</code> — Synthesized Storefront Copy
          <span class="badge ${parallel.copySynthesis.provider === 'parallel' ? 'badge-ok' : 'badge-warn'}">${escapeHtml(parallel.copySynthesis.provider)} (${escapeHtml(parallel.copySynthesis.model)})</span>
        </h2>
        <span style="font-family:var(--mono);font-size:12px;color:var(--muted);">
          ${parallel.copySynthesis.contextChars.toLocaleString()} context chars &bull; ${parallel.copySynthesis.elapsedMs} ms
        </span>
      </div>
      <div class="section-body">
        ${
          edition.alertBanner
            ? `<div style="padding:10px 14px;background:var(--alert-bg);border:2px solid var(--alert);color:var(--alert);font-family:var(--mono);font-weight:700;margin-bottom:14px;">
                URGENT BANNER: ${escapeHtml(edition.alertBanner)}
              </div>`
            : ''
        }

        <div class="three-col">
          <div class="item-card filterable-item">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <span style="font-family:var(--mono);font-size:11px;color:var(--muted);">LEAD STORY (${escapeHtml(edition.leadStory.kicker)})</span>
              <span class="badge badge-ok" title="kicker, headline, and deck render on both Broadsheet and Poster cards">Broadsheet &amp; Poster</span>
            </div>
            <div style="font-family:var(--serif);font-size:19px;font-weight:700;margin:4px 0;">${escapeHtml(edition.leadStory.headline)}</div>
            <div style="font-weight:600;margin-bottom:8px;">${escapeHtml(edition.leadStory.deck)}</div>
            <div style="border-top:1px dashed var(--border-soft);padding-top:6px;">
              <div style="font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-bottom:2px;">POSTER BODY ONLY (hidden on Broadsheet card):</div>
              <div style="font-size:13px;color:var(--muted);">${escapeHtml(edition.leadStory.body)}</div>
            </div>
          </div>

          <div class="item-card filterable-item">
            <div style="font-family:var(--mono);font-size:11px;color:var(--muted);">SEASONAL SPOTLIGHT (${escapeHtml(edition.seasonalSpotlight.windowId)})</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin:4px 0;">
              <strong style="font-size:16px;">${escapeHtml(edition.seasonalSpotlight.headline)}</strong>
              <span class="badge badge-ink">${escapeHtml(edition.seasonalSpotlight.metric)}</span>
            </div>
            <div style="font-size:13px;">${escapeHtml(edition.seasonalSpotlight.body)}</div>
            <hr style="border:none;border-top:1px solid var(--border-soft);margin:10px 0;" />
            <div style="font-family:var(--mono);font-size:11px;color:var(--muted);">FEATURED GATHERING (${escapeHtml(edition.almanacFeature.whenLabel ?? '')})</div>
            <div style="font-weight:700;margin-top:2px;">${escapeHtml(edition.almanacFeature.title)}</div>
            <div style="font-size:13px;">${escapeHtml(edition.almanacFeature.note)}</div>
          </div>

          <div class="item-card filterable-item">
            <div style="font-family:var(--mono);font-size:11px;color:var(--muted);">WEATHER CALLOUT</div>
            <div style="font-weight:700;margin:4px 0;">${escapeHtml(edition.weatherCallout.summaryLine)}</div>
            <div style="font-size:13px;color:var(--muted);">${escapeHtml(edition.weatherCallout.lookaheadLine)}</div>
          </div>
        </div>

        <div class="two-col" style="margin-top:16px;">
          <div>
            <h3 style="font-family:var(--serif);margin:0 0 8px;">All 3 Synthesized Town Bulletins</h3>
            ${edition.dispatches
              .map(
                (d, i) => `<div class="item-card filterable-item">
                  <div style="display:flex;justify-content:space-between;">
                    <span class="badge badge-ink">${escapeHtml(d.kicker)}</span>
                    <span style="font-family:var(--mono);font-size:11px;color:var(--muted);">#${i + 1}${i < 2 ? ' (on Broadsheet card)' : ' (reserve slot)'}</span>
                  </div>
                  <div class="item-title" style="margin-top:5px;">${escapeHtml(d.headline)}</div>
                  <div style="font-size:13px;margin-top:3px;">${escapeHtml(d.body)}</div>
                </div>`,
              )
              .join('')}
          </div>

          <div>
            <h3 style="font-family:var(--serif);margin:0 0 8px;">All 4 Synthesized Upcoming Events</h3>
            ${edition.upcomingEvents
              .map(
                (e, i) => `<div class="item-card filterable-item">
                  <div style="display:flex;justify-content:space-between;">
                    <span class="badge badge-accent">${escapeHtml(e.whenLabel)}</span>
                    <span style="font-family:var(--mono);font-size:11px;color:var(--muted);">#${i + 1}${i < 3 ? ' (on Handbill card)' : ' (reserve slot)'}</span>
                  </div>
                  <div class="item-title" style="margin-top:5px;">${escapeHtml(e.title)}</div>
                  <div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:2px;">${escapeHtml(e.whereAndTime)}</div>
                </div>`,
              )
              .join('')}
          </div>
        </div>

        <details>
          <summary>Merged Web Evidence Snippets Sent to Copy Synthesis (${parallel.snippetsSentToSynthesis.length})</summary>
          <div style="padding:12px;">
            ${
              parallel.snippetsSentToSynthesis.length === 0
                ? `<div style="color:var(--muted);font-family:var(--mono);font-size:12px;">None</div>`
                : parallel.snippetsSentToSynthesis
                    .map(
                      (s) => `<div class="item-card">
                        <div class="item-header">
                          <div class="item-title">${escapeHtml(s.title)}</div>
                          <span class="badge badge-muted">${escapeHtml(s.source)}</span>
                        </div>
                        <a class="item-url" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.url)}</a>
                        <div style="font-size:13px;">${escapeHtml(s.excerpt)}</div>
                      </div>`,
                    )
                    .join('')
            }
          </div>
        </details>
      </div>
    </section>

    <!-- 6. UPSTREAM SENSOR & CALENDAR FEEDS -->
    <section id="upstream" class="section">
      <div class="section-header">
        <h2 class="section-title">Upstream Public Feeds &amp; Hard Calendar Gates</h2>
        <span style="font-family:var(--mono);font-size:12px;color:var(--muted);">NWS BOX/12,35 &bull; USGS 01199000 &bull; Astronomical Almanac</span>
      </div>
      <div class="section-body">
        <div class="three-col">
          <div class="item-card">
            <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--muted);">NOAA / NWS CORNWALL WEATHER</div>
            <div style="font-family:var(--serif);font-size:24px;font-weight:700;margin:4px 0;">
              ${edition.weather.currentTempF}°F — ${escapeHtml(edition.weather.conditions)}
            </div>
            <div style="font-family:var(--mono);font-size:12px;margin-bottom:8px;">
              High ${edition.weather.highF}° &bull; Low ${edition.weather.lowF}° &bull; Wind ${escapeHtml(edition.weather.wind)} &bull; Precip ${edition.weather.todayPrecipPct}%
            </div>
            <div style="font-size:13px;margin-bottom:6px;"><strong>Today:</strong> ${escapeHtml(edition.weather.todaySummary)}</div>
            <div style="font-size:13px;margin-bottom:6px;"><strong>Tonight:</strong> ${escapeHtml(edition.weather.tonightSummary)}</div>
            <div style="font-size:13px;"><strong>Tomorrow:</strong> ${escapeHtml(edition.weather.tomorrowSummary)}</div>
            ${
              edition.weather.alerts.length > 0
                ? `<div style="margin-top:8px;">
                    ${edition.weather.alerts
                      .map(
                        (a) =>
                          `<div style="padding:6px 8px;background:var(--alert-bg);color:var(--alert);font-family:var(--mono);font-size:11.5px;margin-top:4px;"><strong>${escapeHtml(a.event)}:</strong> ${escapeHtml(a.headline)}</div>`,
                      )
                      .join('')}
                  </div>`
                : ''
            }
          </div>

          <div class="item-card">
            <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--muted);">USGS HOUSATONIC RIVER (${escapeHtml(edition.river.siteCode)})</div>
            <div style="font-family:var(--serif);font-size:24px;font-weight:700;margin:4px 0;">
              ${edition.river.dischargeCfs !== null ? `${edition.river.dischargeCfs} CFS` : 'Unavailable'}
            </div>
            <div style="font-family:var(--mono);font-size:12px;margin-bottom:8px;">
              Status: <strong>${escapeHtml(edition.river.statusLabel)}</strong>
              ${edition.river.gageHeightFt !== null ? ` &bull; Gage ${edition.river.gageHeightFt} ft` : ''}
              ${edition.river.waterTempF !== null ? ` &bull; Water ${edition.river.waterTempF}°F` : ''}
            </div>
            <div style="font-size:13px;margin-bottom:8px;">${escapeHtml(edition.river.anglerNote)}</div>
            <hr style="border:none;border-top:1px solid var(--border-soft);margin:10px 0;" />
            <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--muted);">CORNWALL ALMANAC</div>
            <div style="font-family:var(--mono);font-size:12px;margin-top:4px;">
              Sunrise ${escapeHtml(edition.almanac.sunrise)} &bull; Sunset ${escapeHtml(edition.almanac.sunset)}<br/>
              Daylight ${escapeHtml(edition.almanac.dayLengthLabel)} (${escapeHtml(edition.almanac.daylightDeltaLabel)})<br/>
              Moon: ${escapeHtml(edition.almanac.moonPhaseName)} (${edition.almanac.moonIlluminationPct}% lit)
            </div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:6px;">${escapeHtml(edition.almanac.phenologyNote)}</div>
          </div>

          <div class="item-card">
            <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;">
              ELIGIBLE SEASONAL WINDOWS TODAY (${eligibleWindows.length})
            </div>
            ${eligibleWindows
              .map(
                (w) => `<div style="padding:8px 0;border-bottom:1px solid var(--border-soft);">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong>${escapeHtml(w.label)}</strong>
                    <span class="badge ${w.id === edition.seasonalSpotlight.windowId ? 'badge-ink' : 'badge-muted'}">${escapeHtml(w.id)}</span>
                  </div>
                  <div style="font-family:var(--mono);font-size:11px;color:var(--muted);">Rule: ${escapeHtml(w.windowRule)}</div>
                  <div style="font-size:12.5px;margin-top:2px;">${escapeHtml(w.factualContext)}</div>
                </div>`,
              )
              .join('')}
          </div>
        </div>
      </div>
    </section>

    <!-- 7. RAW FULL JSON INSPECTOR -->
    <section id="raw-json" class="section">
      <div class="section-header">
        <h2 class="section-title">Raw Full Data Payload</h2>
        <button type="button" id="copy-json-btn" class="btn" style="background:var(--ink);">Copy Full JSON</button>
      </div>
      <div class="section-body" style="padding:0;">
        <details>
          <summary style="padding:12px 18px;">Expand Complete AdminDataPayload JSON</summary>
          <pre id="raw-json-pre">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
        </details>
      </div>
    </section>
  </main>

  <script>
    (function () {
      const input = document.getElementById('admin-filter');
      if (input) {
        input.addEventListener('input', function () {
          const q = input.value.trim().toLowerCase();
          const items = document.querySelectorAll('.filterable-item');
          items.forEach(function (el) {
            if (!q) {
              el.classList.remove('hidden-by-filter');
              return;
            }
            const text = (el.textContent || '').toLowerCase();
            el.classList.toggle('hidden-by-filter', !text.includes(q));
          });
        });
      }

      const copyBtn = document.getElementById('copy-json-btn');
      const pre = document.getElementById('raw-json-pre');
      if (copyBtn && pre) {
        copyBtn.addEventListener('click', function () {
          navigator.clipboard.writeText(pre.textContent || '').then(function () {
            const orig = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(function () { copyBtn.textContent = orig; }, 1600);
          });
        });
      }
    })();
  </script>
</body>
</html>`;
}
