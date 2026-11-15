import type { HourlyPoint } from '../types.js';

export function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Room-readable 1-bit (#000 / #fff) 12-hour temperature curve + bold hatched precip bars.
 * Designed for 7.5" 800x480 e-ink: >=14px mono labels, 4px curve stroke, 2px grid rules.
 */
export function renderHourlyChartSvg(
  hourly: HourlyPoint[],
  width = 740,
  height = 190,
  idSuffix = 'sky',
): string {
  const pts = hourly.slice(0, 12);
  if (pts.length < 2) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="#fff" stroke="#000" stroke-width="2"/>
      <text x="${width / 2}" y="${height / 2 + 6}" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-weight="700" font-size="16" fill="#000">FORECAST CURVE UPDATING</text>
    </svg>`;
  }

  const padLeft = 46;
  const padRight = 22;
  const padTop = 30;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const temps = pts.map((p) => p.tempF);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const span = Math.max(6, maxT - minT);
  const loBound = minT - Math.ceil(span * 0.18);
  const hiBound = maxT + Math.ceil(span * 0.22);
  const range = Math.max(1, hiBound - loBound);

  const xAt = (i: number) => padLeft + (i / (pts.length - 1)) * plotW;
  const yAt = (t: number) => padTop + (1 - (t - loBound) / range) * plotH;

  const polyPoints = pts
    .map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.tempF).toFixed(1)}`)
    .join(' ');

  let maxIdx = 0;
  let minIdx = 0;
  pts.forEach((p, i) => {
    if (p.tempF > pts[maxIdx].tempF) maxIdx = i;
    if (p.tempF < pts[minIdx].tempF) minIdx = i;
  });

  const colW = plotW / pts.length;
  const precipBars = pts
    .map((p, i) => {
      if (p.precipPct < 20) return '';
      const barH = Math.max(8, (Math.min(100, p.precipPct) / 100) * (plotH * 0.55));
      const bx = padLeft + i * colW + 4;
      const bw = Math.max(10, colW - 8);
      const by = padTop + plotH - barH;
      return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" fill="url(#hatch-${idSuffix})" stroke="#000" stroke-width="2"/>`;
    })
    .join('\n');

  const timeLabels = pts
    .map((p, i) => {
      if (i % 3 !== 0 && i !== pts.length - 1) return '';
      if (i === pts.length - 1 && (pts.length - 1) % 3 === 1) return '';
      return `<text x="${xAt(i).toFixed(1)}" y="${height - 6}" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-weight="700" font-size="14" fill="#000">${escapeHtml(p.hourLabel)}</text>`;
    })
    .join('\n');

  const dots = pts
    .map((p, i) => {
      const cx = xAt(i).toFixed(1);
      const cy = yAt(p.tempF).toFixed(1);
      const isKey = i === maxIdx || i === minIdx || i % 3 === 0;
      return isKey
        ? `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#000" stroke="#fff" stroke-width="2"/>`
        : `<circle cx="${cx}" cy="${cy}" r="3" fill="#000"/>`;
    })
    .join('\n');

  const maxX = Math.min(padLeft + plotW - 22, Math.max(padLeft + 24, xAt(maxIdx)));
  const maxY = Math.max(18, yAt(pts[maxIdx].tempF) - 10);
  const minX = Math.min(padLeft + plotW - 22, Math.max(padLeft + 26, xAt(minIdx)));
  const minY = Math.min(padTop + plotH - 6, yAt(pts[minIdx].tempF) + 21);

  const showMinCallout = maxIdx !== minIdx && minIdx > 1 && Math.abs(maxT - minT) >= 4;

  const callouts = [
    `<rect x="${(maxX - 22).toFixed(1)}" y="${(maxY - 15).toFixed(1)}" width="44" height="19" rx="3" fill="#000"/>`,
    `<text x="${maxX.toFixed(1)}" y="${(maxY - 1).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-weight="700" font-size="14" fill="#fff">${pts[maxIdx].tempF}°</text>`,
    showMinCallout
      ? `<rect x="${(minX - 20).toFixed(1)}" y="${(minY - 14).toFixed(1)}" width="40" height="18" fill="#fff" stroke="#000" stroke-width="2"/>
         <text x="${minX.toFixed(1)}" y="${(minY - 1).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-weight="700" font-size="13" fill="#000">${pts[minIdx].tempF}°</text>`
      : '',
  ].join('\n');

  const midY = padTop + plotH / 2;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="hatch-${idSuffix}" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#fff"/>
        <line x1="0" y1="0" x2="0" y2="8" stroke="#000" stroke-width="3"/>
      </pattern>
    </defs>

    <!-- Y-axis high / low anchors (14px bold mono) -->
    <text x="${padLeft - 10}" y="${padTop + 5}" text-anchor="end" font-family="'IBM Plex Mono', monospace" font-size="14" font-weight="700" fill="#000">${maxT}°</text>
    <text x="${padLeft - 10}" y="${padTop + plotH}" text-anchor="end" font-family="'IBM Plex Mono', monospace" font-size="14" font-weight="700" fill="#000">${minT}°</text>

    <!-- Crisp 2px guide lines -->
    <line x1="${padLeft}" y1="${padTop}" x2="${padLeft + plotW}" y2="${padTop}" stroke="#000" stroke-width="1.5" stroke-dasharray="5,5"/>
    <line x1="${padLeft}" y1="${midY.toFixed(1)}" x2="${padLeft + plotW}" y2="${midY.toFixed(1)}" stroke="#000" stroke-width="1.5" stroke-dasharray="3,6"/>
    <line x1="${padLeft}" y1="${padTop + plotH}" x2="${padLeft + plotW}" y2="${padTop + plotH}" stroke="#000" stroke-width="2.5"/>

    ${precipBars}
    <polyline fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" points="${polyPoints}"/>
    <polyline fill="none" stroke="#000" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" points="${polyPoints}"/>
    ${dots}
    ${callouts}
    ${timeLabels}
  </svg>`;
}

/**
 * Large, bold 1-bit lunar phase medallion for the Almanac Poster.
 */
export function renderMoonMedallionSvg(phaseFraction: number, size = 104): string {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 3;
  const r = Math.round(size * 0.35);

  const p = ((phaseFraction % 1) + 1) % 1;

  let litPath = '';
  if (p < 0.03 || p > 0.97) {
    litPath = '';
  } else if (p > 0.47 && p < 0.53) {
    litPath = `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="#fff"/>`;
  } else {
    const waxing = p < 0.5;
    const cosTerm = Math.cos(2 * Math.PI * p);
    const rad = r - 1;
    const rx = Math.abs(cosTerm) * rad;

    if (waxing) {
      const termSweep = p < 0.25 ? 0 : 1;
      litPath = `<path d="M ${cx} ${cy - rad} A ${rad} ${rad} 0 0 1 ${cx} ${cy + rad} A ${rx.toFixed(2)} ${rad} 0 0 ${termSweep} ${cx} ${cy - rad} Z" fill="#fff"/>`;
    } else {
      const termSweep = p < 0.75 ? 0 : 1;
      litPath = `<path d="M ${cx} ${cy - rad} A ${rad} ${rad} 0 0 0 ${cx} ${cy + rad} A ${rx.toFixed(2)} ${rad} 0 0 ${termSweep} ${cx} ${cy - rad} Z" fill="#fff"/>`;
    }
  }

  const ticks = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      const r1 = deg % 90 === 0 ? outerR - 8 : outerR - 5;
      const x1 = cx + r1 * Math.cos(a);
      const y1 = cy + r1 * Math.sin(a);
      const x2 = cx + outerR * Math.cos(a);
      const y2 = cy + outerR * Math.sin(a);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#000" stroke-width="${deg % 90 === 0 ? '3' : '2'}"/>`;
    })
    .join('');

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${outerR}" fill="#fff" stroke="#000" stroke-width="3"/>
    ${ticks}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" stroke="#000" stroke-width="2.5"/>
    ${litPath}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-width="2.5"/>
  </svg>`;
}

/**
 * Bold 1-bit woodcut weather glyph with heavy strokes (>=2.8px) that hold cleanly on e-ink.
 */
export function renderWeatherGlyphSvg(conditions: string, size = 64): string {
  const c = conditions.toLowerCase();
  if (c.includes('snow') || c.includes('flurr') || c.includes('wintry')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 29H36A7.5 7.5 0 0 0 36 14A10 10 0 0 0 17 12A7.5 7.5 0 0 0 12 29Z" fill="#fff" stroke="#000" stroke-width="3.2"/>
      <g stroke="#000" stroke-width="3" stroke-linecap="round">
        <line x1="16" y1="34" x2="16" y2="42"/><line x1="12" y1="38" x2="20" y2="38"/>
        <line x1="25" y1="35" x2="25" y2="43"/><line x1="21" y1="39" x2="29" y2="39"/>
        <line x1="34" y1="33" x2="34" y2="41"/><line x1="30" y1="37" x2="38" y2="37"/>
      </g>
    </svg>`;
  }
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle') || c.includes('storm')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 28H36A7.5 7.5 0 0 0 36 13A10 10 0 0 0 17 11A7.5 7.5 0 0 0 11 28Z" fill="#000" stroke="#000" stroke-width="3"/>
      <g stroke="#000" stroke-width="3.2" stroke-linecap="round">
        <line x1="16" y1="33" x2="12" y2="43"/>
        <line x1="25" y1="33" x2="21" y2="43"/>
        <line x1="34" y1="33" x2="30" y2="43"/>
      </g>
    </svg>`;
  }
  if (c.includes('partly') || c.includes('mostly sunny') || c.includes('mostly clear')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="17" r="7.5" fill="#fff" stroke="#000" stroke-width="3"/>
      <g stroke="#000" stroke-width="3" stroke-linecap="round">
        <line x1="17" y1="3" x2="17" y2="7"/><line x1="6" y1="17" x2="2" y2="17"/>
        <line x1="8" y1="8" x2="11" y2="11"/><line x1="26" y1="8" x2="23" y2="11"/>
      </g>
      <path d="M15 36H38A7 7 0 0 0 38 22A9.5 9.5 0 0 0 21 20A7 7 0 0 0 15 36Z" fill="#fff" stroke="#000" stroke-width="3.2"/>
    </svg>`;
  }
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog') || c.includes('dreary')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 35H38A8 8 0 0 0 38 19A11 11 0 0 0 17 16A8 8 0 0 0 10 35Z" fill="#fff" stroke="#000" stroke-width="3.4"/>
      <line x1="15" y1="30" x2="34" y2="30" stroke="#000" stroke-width="2.5"/>
    </svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="10" fill="#fff" stroke="#000" stroke-width="3.4"/>
    <circle cx="24" cy="24" r="4.5" fill="#000"/>
    <g stroke="#000" stroke-width="3.2" stroke-linecap="round">
      <line x1="24" y1="4" x2="24" y2="9"/><line x1="24" y1="39" x2="24" y2="44"/>
      <line x1="4" y1="24" x2="9" y2="24"/><line x1="39" y1="24" x2="44" y2="24"/>
      <line x1="9.8" y1="9.8" x2="13.5" y2="13.5"/><line x1="34.5" y1="34.5" x2="38.2" y2="38.2"/>
      <line x1="38.2" y1="9.8" x2="34.5" y2="13.5"/><line x1="13.5" y1="34.5" x2="9.8" y2="38.2"/>
    </g>
  </svg>`;
}

/**
 * Bold 1-bit West Cornwall Covered Bridge woodcut emblem.
 */
export function renderCoveredBridgeEmblemSvg(width = 68, height = 28): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 76 30" xmlns="http://www.w3.org/2000/svg">
    <polygon points="6,12 38,2 70,12" fill="#000"/>
    <rect x="10" y="12" width="56" height="10" fill="#fff" stroke="#000" stroke-width="2.4"/>
    <rect x="18" y="14.5" width="7" height="4.5" fill="#000"/>
    <rect x="34.5" y="14.5" width="7" height="4.5" fill="#000"/>
    <rect x="51" y="14.5" width="7" height="4.5" fill="#000"/>
    <polygon points="3,22 15,22 13,28 3,28" fill="#000"/>
    <polygon points="61,22 73,22 73,28 63,28" fill="#000"/>
    <path d="M18 26 Q25 23.5 32 26 T46 26 T58 26" fill="none" stroke="#000" stroke-width="2.2"/>
  </svg>`;
}
