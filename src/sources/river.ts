import type { RiverData } from '../types.js';

// USGS 01199000: Housatonic River at Falls Village, CT (just upstream of West Cornwall Covered Bridge)
const USGS_URL =
  'https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01199000&parameterCd=00060,00065,00010';

export async function fetchHousatonicRiver(): Promise<RiverData> {
  const fallback: RiverData = {
    siteName: 'Housatonic River @ Falls Village / Covered Bridge',
    siteCode: '01199000',
    dischargeCfs: null,
    gageHeightFt: null,
    waterTempF: null,
    statusLabel: 'UNAVAILABLE',
    anglerNote: 'USGS gauge temporarily offline.',
    observedAt: null,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(USGS_URL, { signal: controller.signal });
    if (!res.ok) return fallback;
    const json = (await res.json()) as any;
    const seriesList: any[] = json?.value?.timeSeries ?? [];

    let dischargeCfs: number | null = null;
    let gageHeightFt: number | null = null;
    let waterTempF: number | null = null;
    let observedAt: string | null = null;

    for (const s of seriesList) {
      const code = String(s?.variable?.variableCode?.[0]?.value ?? '');
      const latest = s?.values?.[0]?.value?.[0];
      if (!latest) continue;
      const num = Number(latest.value);
      if (!Number.isFinite(num) || num < -999) continue;
      observedAt = observedAt ?? String(latest.dateTime ?? '');

      if (code === '00060') {
        dischargeCfs = Math.round(num);
      } else if (code === '00065') {
        gageHeightFt = Number(num.toFixed(2));
      } else if (code === '00010') {
        // Celsius to Fahrenheit
        waterTempF = Math.round((num * 9) / 5 + 32);
      }
    }

    if (dischargeCfs === null) return fallback;

    let statusLabel = 'STEADY FLOW';
    let anglerNote = 'Comfortable wading & drift levels through Cornwall Meadows.';
    if (dischargeCfs < 350) {
      statusLabel = 'LOW & CLEAR';
      anglerNote = 'Easy wading at Covered Bridge & Housatonic Meadows; stealthy casts.';
    } else if (dischargeCfs <= 1100) {
      statusLabel = 'PRIME WADING';
      anglerNote = 'Classic fly-water flow through West Cornwall & Housatonic Meadows.';
    } else if (dischargeCfs <= 2200) {
      statusLabel = 'BRISK / BOATABLE';
      anglerNote = 'Strong current; stout wading or prime drift/paddle conditions.';
    } else {
      statusLabel = 'HIGH WATER';
      anglerNote = 'Elevated Housatonic flow — use caution along banks and rapids.';
    }

    return {
      siteName: 'Housatonic River @ West Cornwall / Falls Village',
      siteCode: '01199000',
      dischargeCfs,
      gageHeightFt,
      waterTempF,
      statusLabel,
      anglerNote,
      observedAt,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
