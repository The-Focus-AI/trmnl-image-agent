import type { ArchetypeId, Daypart, Edition } from '../types.js';
import { DISPATCH_STYLES } from './styles.js';
import {
  escapeHtml,
  renderCoveredBridgeEmblemSvg,
  renderHourlyChartSvg,
  renderMoonMedallionSvg,
  renderWeatherGlyphSvg,
} from './svg.js';

function renderTopBar(ed: Edition, showWeatherPill = true): string {
  const condShort = ed.weather.conditions.split(' ').slice(0, 2).join(' ');
  return `<header class="top-bar">
    <div class="brand-lockup">
      ${renderCoveredBridgeEmblemSvg(62, 26)}
      <div class="brand-title">The Cornwall Dispatch</div>
    </div>
    <div class="top-meta">
      <div class="top-date">${escapeHtml(ed.dateLabel)}</div>
      ${
        showWeatherPill
          ? `<div class="weather-pill">${ed.weather.currentTempF}°F &bull; ${escapeHtml(condShort)}</div>`
          : `<div class="weather-pill">CORNWALL, CT</div>`
      }
    </div>
  </header>`;
}

/**
 * CARD 1: SKY & RIVER BOARD (dispatch)
 * Giant Cornwall temperature, Housatonic River CFS, and full-width 12-hour forecast curve.
 */
function renderSkyAndRiverPoster(ed: Edition): string {
  const riverCfs =
    ed.river.dischargeCfs !== null ? `${ed.river.dischargeCfs}` : '--';

  return `<main class="screen card-sky">
    ${renderTopBar(ed, false)}

    <!-- Hero Weather + River Row -->
    <section style="display:grid;grid-template-columns:1fr 278px;gap:18px;align-items:stretch;margin-top:12px;height:126px;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:16px;">
        ${renderWeatherGlyphSvg(ed.weather.conditions, 74)}
        <div style="font-family:var(--font-cond);font-weight:800;font-size:76px;line-height:0.86;letter-spacing:-0.02em;">
          ${ed.weather.currentTempF}°
        </div>
        <div style="min-width:0;">
          <div style="font-family:var(--font-cond);font-weight:800;font-size:28px;line-height:1.05;text-transform:uppercase;" class="clamp-1">
            ${escapeHtml(ed.weather.conditions)}
          </div>
          <div style="font-family:var(--font-mono);font-weight:700;font-size:16px;margin-top:5px;">
            HIGH ${ed.weather.highF}° &bull; LOW ${ed.weather.lowF}°
          </div>
          <div style="font-family:var(--font-mono);font-weight:600;font-size:14.5px;margin-top:2px;" class="clamp-1">
            WIND ${escapeHtml(ed.weather.wind)}
          </div>
        </div>
      </div>

      <div style="border:3px solid #000;padding:9px 13px;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="tag-inv">HOUSATONIC RIVER</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:7px;">
          <span style="font-family:var(--font-cond);font-weight:800;font-size:46px;line-height:0.95;">${escapeHtml(riverCfs)}</span>
          <span style="font-family:var(--font-mono);font-weight:700;font-size:18px;">CFS</span>
        </div>
        <div style="font-family:var(--font-cond);font-weight:800;font-size:16px;letter-spacing:0.05em;text-transform:uppercase;" class="clamp-1">
          ${escapeHtml(ed.river.statusLabel)} &bull; SUNSET ${escapeHtml(ed.almanac.sunset)}
        </div>
      </div>
    </section>

    <!-- Giant Full-Width 12-Hour Curve -->
    <section style="margin-top:10px;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
      ${renderHourlyChartSvg(ed.weather.hourly, 754, 182, 'sky')}
    </section>

    <!-- Crisp 1-Line Counter Lookahead -->
    <footer style="border-top:2.5px solid #000;padding-top:8px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-shrink:0;">
      <div style="font-size:17.5px;font-weight:700;line-height:1.2;" class="clamp-1">
        ${escapeHtml(ed.weatherCallout.lookaheadLine || ed.weatherCallout.summaryLine)}
      </div>
      <div style="font-family:var(--font-mono);font-weight:700;font-size:14px;white-space:nowrap;">
        CORNWALL SKY
      </div>
    </footer>
  </main>`;
}

/**
 * CARD 2: TOWN BULLETIN POSTER (broadsheet)
 * One bold 38px Cornwall headline + 2 roomy counter-readable local takeaways.
 */
function renderTownBulletinPoster(ed: Edition): string {
  return `<main class="screen card-town">
    ${renderTopBar(ed, true)}

    <!-- Lead Cornwall Story -->
    <section style="margin-top:14px;padding-bottom:14px;border-bottom:2.5px solid #000;flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;">
      <div style="margin-bottom:8px;display:flex;align-items:center;gap:10px;">
        <span class="tag-inv">${escapeHtml(ed.leadStory.kicker)}</span>
        <span style="font-family:var(--font-mono);font-weight:700;font-size:14px;">${escapeHtml(ed.editionLabel)}</span>
      </div>
      <h1 style="font-family:var(--font-display);font-weight:900;font-size:38px;line-height:1.07;letter-spacing:-0.01em;" class="clamp-2">
        ${escapeHtml(ed.leadStory.headline)}
      </h1>
      <p style="font-size:20px;font-weight:500;line-height:1.28;margin-top:9px;" class="clamp-2">
        ${escapeHtml(ed.leadStory.deck)}
      </p>
    </section>

    <!-- Two Clean Supporting Bulletins -->
    <section style="margin-top:13px;height:152px;flex-shrink:0;display:grid;grid-template-columns:1fr 1fr;gap:0;">
      ${ed.dispatches
        .slice(0, 2)
        .map(
          (d, idx) => `<div style="${
            idx === 0
              ? 'padding-right:18px;border-right:2.5px solid #000;'
              : 'padding-left:18px;'
          }display:flex;flex-direction:column;min-height:0;overflow:hidden;">
            <div style="margin-bottom:6px;">
              <span class="tag-outline">${escapeHtml(d.kicker)}</span>
            </div>
            <h2 style="font-family:var(--font-display);font-weight:800;font-size:22px;line-height:1.15;" class="clamp-2">
              ${escapeHtml(d.headline)}
            </h2>
            <p style="font-size:16.5px;font-weight:500;line-height:1.26;margin-top:5px;" class="clamp-2">
              ${escapeHtml(d.body)}
            </p>
          </div>`,
        )
        .join('')}
    </section>
  </main>`;
}

/**
 * CARD 3: COMING UP IN CORNWALL POSTER (handbill)
 * Three upcoming Cornwall community events in big, across-the-counter 25px rows.
 */
function renderEventsPoster(ed: Edition): string {
  const events = ed.upcomingEvents.slice(0, 3);

  return `<main class="screen card-events">
    ${renderTopBar(ed, true)}

    <div style="margin-top:12px;background:#000;color:#fff;padding:6px 12px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
      <span style="font-family:var(--font-cond);font-weight:800;font-size:19px;letter-spacing:0.08em;text-transform:uppercase;">
        COMING UP IN CORNWALL
      </span>
      <span style="font-family:var(--font-mono);font-weight:700;font-size:14px;">
        TOWN &amp; CHRONICLE CALENDAR
      </span>
    </div>

    <section style="margin-top:6px;flex:1;min-height:0;display:grid;grid-template-rows:repeat(3, 1fr);">
      ${events
        .map(
          (ev, idx) => `<div style="display:grid;grid-template-columns:158px 1fr;gap:16px;align-items:center;${
            idx < events.length - 1 ? 'border-bottom:2.5px solid #000;' : ''
          }padding:8px 0;">
            <div style="border:2.5px solid #000;padding:8px 10px;text-align:center;font-family:var(--font-cond);font-weight:800;font-size:20px;letter-spacing:0.05em;text-transform:uppercase;line-height:1.1;" class="clamp-1">
              ${escapeHtml(ev.whenLabel)}
            </div>
            <div style="min-width:0;">
              <div style="font-family:var(--font-display);font-weight:800;font-size:25px;line-height:1.14;" class="clamp-1">
                ${escapeHtml(ev.title)}
              </div>
              <div style="font-family:var(--font-mono);font-weight:600;font-size:16.5px;margin-top:4px;" class="clamp-1">
                ${escapeHtml(ev.whereAndTime)}
              </div>
            </div>
          </div>`,
        )
        .join('')}
    </section>
  </main>`;
}

/**
 * CARD 4: ALMANAC & WOODS POSTER (almanac)
 * Giant woodcut Moon Medallion, Sunrise/Sunset daylight table, and Calendar-Gated Seasonal Spotlight.
 */
function renderAlmanacPoster(ed: Edition): string {
  return `<main class="screen card-almanac">
    ${renderTopBar(ed, true)}

    <!-- Top Celestial & Daylight Box -->
    <section style="margin-top:13px;border:3px solid #000;padding:12px 16px;height:166px;flex-shrink:0;display:grid;grid-template-columns:126px 1fr 244px;align-items:center;gap:14px;">
      <div style="display:flex;align-items:center;justify-content:center;">
        ${renderMoonMedallionSvg(ed.almanac.moonPhaseFraction, 116)}
      </div>

      <div style="min-width:0;">
        <span class="tag-inv">CORNWALL ALMANAC</span>
        <div style="font-family:var(--font-display);font-weight:900;font-size:29px;line-height:1.1;margin-top:6px;" class="clamp-1">
          ${escapeHtml(ed.almanac.moonPhaseName)}
        </div>
        <div style="font-family:var(--font-mono);font-weight:700;font-size:16px;margin-top:5px;">
          ${ed.almanac.moonIlluminationPct}% LIT &bull; DAY ${escapeHtml(ed.almanac.dayLengthLabel)}
        </div>
      </div>

      <div style="border-left:2.5px solid #000;padding-left:16px;display:flex;flex-direction:column;gap:6px;font-family:var(--font-mono);">
        <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:700;">
          <span>SUNRISE</span>
          <span>${escapeHtml(ed.almanac.sunrise)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:700;">
          <span>SUNSET</span>
          <span>${escapeHtml(ed.almanac.sunset)}</span>
        </div>
        <div style="border-top:2px solid #000;padding-top:5px;display:flex;justify-content:space-between;font-size:15.5px;font-weight:700;">
          <span>DAILY SHIFT</span>
          <span>${escapeHtml(ed.almanac.daylightDeltaLabel)}</span>
        </div>
      </div>
    </section>

    <!-- Bottom 2-Up: Calendar-Gated Seasonal Spotlight + Field Note -->
    <section style="margin-top:14px;flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
      <div style="border:2.5px solid #000;padding:11px 14px;display:flex;flex-direction:column;min-height:0;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
          <span class="tag-inv">${escapeHtml(ed.seasonalSpotlight.kicker)}</span>
          <span style="font-family:var(--font-mono);font-weight:700;font-size:16px;">${escapeHtml(ed.seasonalSpotlight.metric)}</span>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:800;font-size:22px;line-height:1.15;" class="clamp-2">
          ${escapeHtml(ed.seasonalSpotlight.headline)}
        </h2>
        <p style="font-size:16.5px;font-weight:500;line-height:1.26;margin-top:5px;" class="clamp-2">
          ${escapeHtml(ed.seasonalSpotlight.body)}
        </p>
      </div>

      <div style="border:2.5px solid #000;padding:11px 14px;display:flex;flex-direction:column;min-height:0;overflow:hidden;">
        <div style="margin-bottom:6px;">
          <span class="tag-outline">FIELD &amp; NATURE NOTE</span>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:800;font-size:22px;line-height:1.15;" class="clamp-2">
          ${escapeHtml(ed.almanacFeature.title)}
        </h2>
        <p style="font-size:16.5px;font-weight:500;line-height:1.26;margin-top:5px;" class="clamp-2">
          ${escapeHtml(ed.almanacFeature.note)}
        </p>
      </div>
    </section>
  </main>`;
}

/**
 * CARD 5: SPECIAL BULLETIN / ADVISORY POSTER (poster)
 * Full-screen high-impact striped placard for weather warnings, school snow days, or marquee events.
 */
function renderSpecialPoster(ed: Edition): string {
  const bannerLabel = ed.alertBanner || `${ed.leadStory.kicker} • SPECIAL DISPATCH`;
  const riverCfs =
    ed.river.dischargeCfs !== null ? `${ed.river.dischargeCfs} CFS` : ed.river.statusLabel;

  return `<main class="screen card-poster" style="padding:0;">
    <div class="hazard-stripe" style="height:14px;border-bottom:3px solid #000;flex-shrink:0;"></div>

    <div style="flex:1;min-height:0;padding:14px 24px;display:flex;flex-direction:column;justify-content:space-between;">
      <header style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #000;padding-bottom:8px;">
        <div class="brand-title">The Cornwall Dispatch</div>
        <div class="top-date">${escapeHtml(ed.dateLabel)} &bull; ${escapeHtml(ed.editionLabel)}</div>
      </header>

      <div style="background:#000;color:#fff;padding:7px 14px;font-family:var(--font-cond);font-weight:800;font-size:20px;letter-spacing:0.07em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;">
        <span class="clamp-1">▲ ${escapeHtml(bannerLabel)}</span>
        <span>CORNWALL</span>
      </div>

      <section style="padding:6px 0;">
        <h1 style="font-family:var(--font-display);font-weight:900;font-size:42px;line-height:1.05;" class="clamp-2">
          ${escapeHtml(ed.leadStory.headline)}
        </h1>
        <p style="font-size:22px;font-weight:600;line-height:1.26;margin-top:10px;" class="clamp-2">
          ${escapeHtml(ed.leadStory.deck)}
        </p>
      </section>

      <footer style="border:3px solid #000;padding:10px 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-family:var(--font-mono);">
        <div>
          <div style="font-size:13.5px;font-weight:700;">NOW IN CORNWALL</div>
          <div style="font-family:var(--font-cond);font-weight:800;font-size:24px;line-height:1.05;" class="clamp-1">
            ${ed.weather.currentTempF}°F ${escapeHtml(ed.weather.conditions.split(' ').slice(0, 2).join(' '))}
          </div>
        </div>
        <div style="border-left:2px solid #000;padding-left:12px;">
          <div style="font-size:13.5px;font-weight:700;">TODAY RANGE</div>
          <div style="font-family:var(--font-cond);font-weight:800;font-size:26px;line-height:1.05;">
            HIGH ${ed.weather.highF}° / LOW ${ed.weather.lowF}°
          </div>
        </div>
        <div style="border-left:2px solid #000;padding-left:12px;">
          <div style="font-size:13.5px;font-weight:700;">HOUSATONIC</div>
          <div style="font-family:var(--font-cond);font-weight:800;font-size:26px;line-height:1.05;">
            ${escapeHtml(riverCfs)}
          </div>
        </div>
      </footer>
    </div>

    <div class="hazard-stripe" style="height:14px;border-top:3px solid #000;flex-shrink:0;"></div>
  </main>`;
}

const ARCHETYPE_LABELS: Record<ArchetypeId, string> = {
  dispatch: '1. Sky & River',
  broadsheet: '2. Town Bulletin',
  handbill: '3. Coming Up',
  almanac: '4. Almanac & Woods',
  poster: '5. Special Poster',
};

const DAYPART_LABELS: Record<Daypart, string> = {
  morning: 'Morning',
  midday: 'Midday',
  evening: 'Evening',
  weekend: 'Weekend',
};

function renderPreviewToolbar(ed: Edition, einkSim: boolean): string {
  const einkParam = einkSim ? '1' : '0';
  const archLinks = (Object.keys(ARCHETYPE_LABELS) as ArchetypeId[])
    .map((id) => {
      const active = ed.archetype === id ? 'active' : '';
      return `<a class="preview-link ${active}" href="?frame=1&amp;eink=${einkParam}&amp;archetype=${id}&amp;daypart=${ed.daypart}">${ARCHETYPE_LABELS[id]}</a>`;
    })
    .join('');

  const dayLinks = (Object.keys(DAYPART_LABELS) as Daypart[])
    .map((dp) => {
      const active = ed.daypart === dp ? 'active' : '';
      return `<a class="preview-link ${active}" href="?frame=1&amp;eink=${einkParam}&amp;archetype=${ed.archetype}&amp;daypart=${dp}">${DAYPART_LABELS[dp]}</a>`;
    })
    .join('');

  const toggleEinkHref = `?frame=1&amp;eink=${einkSim ? '0' : '1'}&amp;archetype=${ed.archetype}&amp;daypart=${ed.daypart}`;

  return `<nav class="preview-toolbar">
    <div class="preview-group">
      <span>Rotating Poster:</span>
      ${archLinks}
    </div>
    <div class="preview-group">
      <span>Daypart:</span>
      ${dayLinks}
    </div>
    <div class="preview-group">
      <a class="preview-link ${einkSim ? 'active' : ''}" href="${toggleEinkHref}">1-Bit E-Ink Sim: ${einkSim ? 'ON' : 'OFF'}</a>
      <a class="preview-link" href="/">Raw 800×480</a>
    </div>
  </nav>`;
}

const EINK_SVG_FILTER = `<svg width="0" height="0" style="position:absolute;pointer-events:none;" aria-hidden="true">
  <defs>
    <filter id="trmnl-1bit-threshold" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0"/>
      <feComponentTransfer>
        <feFuncR type="discrete" tableValues="0 1"/>
        <feFuncG type="discrete" tableValues="0 1"/>
        <feFuncB type="discrete" tableValues="0 1"/>
      </feComponentTransfer>
    </filter>
  </defs>
</svg>`;

export function renderEditionHtml(
  edition: Edition,
  options?: { previewFrame?: boolean; einkSim?: boolean },
): string {
  const previewFrame = Boolean(options?.previewFrame);
  const einkSim = options?.einkSim ?? true;

  let screenMarkup: string;
  switch (edition.archetype) {
    case 'dispatch':
      screenMarkup = renderSkyAndRiverPoster(edition);
      break;
    case 'handbill':
      screenMarkup = renderEventsPoster(edition);
      break;
    case 'almanac':
      screenMarkup = renderAlmanacPoster(edition);
      break;
    case 'poster':
      screenMarkup = renderSpecialPoster(edition);
      break;
    case 'broadsheet':
    default:
      screenMarkup = renderTownBulletinPoster(edition);
      break;
  }

  const bodyContent = previewFrame
    ? `${EINK_SVG_FILTER}
       ${renderPreviewToolbar(edition, einkSim)}
       <div class="device-bezel">
         ${screenMarkup}
         <div class="device-caption">
           <span>THE CORNWALL DISPATCH &bull; 800×480 E-INK (AUTO-ROTATES EVERY 15M)</span>
           <span>DECISIONS: ${escapeHtml(edition.routingMeta.decisionProvider.toUpperCase())} &bull; CHRONICLE: ${escapeHtml(edition.routingMeta.chronicleIssue)}</span>
         </div>
       </div>`
    : screenMarkup;

  const bodyClasses = [
    previewFrame ? 'preview-mode' : '',
    previewFrame && einkSim ? 'eink-sim' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=800, initial-scale=1" />
  <title>The Cornwall Dispatch — ${escapeHtml(edition.dateLabel)} (${escapeHtml(edition.editionLabel)})</title>
  <style>${DISPATCH_STYLES}</style>
</head>
<body class="${bodyClasses}" data-archetype="${escapeHtml(edition.archetype)}" data-daypart="${escapeHtml(edition.daypart)}">
  ${bodyContent}
</body>
</html>`;
}
