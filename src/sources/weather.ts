import { CORNWALL_TZ } from '../seasonal.js';
import type { ForecastDay, HourlyPoint, WeatherAlert, WeatherData } from '../types.js';

const NWS_HEADERS = {
  'User-Agent': '(TheFocus.AI Cornwall Dispatch, dispatch@thefocus.ai)',
  Accept: 'application/geo+json',
};

// Pre-resolved NWS gridpoint for Cornwall, CT (41.8456, -73.3284) -> ALY/92,29
const FORECAST_URL = 'https://api.weather.gov/gridpoints/ALY/92,29/forecast';
const HOURLY_URL = 'https://api.weather.gov/gridpoints/ALY/92,29/forecast/hourly';
const ALERTS_URL = 'https://api.weather.gov/alerts/active?point=41.8456,-73.3284';

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 4500): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: NWS_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function formatHourShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CORNWALL_TZ,
      hour: 'numeric',
      hour12: true,
    })
      .format(new Date(iso))
      .replace(/\s+/g, '');
  } catch {
    return '';
  }
}

function shortenCondition(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return 'Fair';
  if (cleaned.length <= 18) return cleaned;
  return cleaned
    .replace(/Chance /gi, '')
    .replace(/Slight /gi, '')
    .replace(/And /gi, '& ')
    .replace(/Thunderstorms/gi, 'T-Storms')
    .slice(0, 22)
    .trim();
}

export async function fetchCornwallWeather(): Promise<WeatherData> {
  const [forecastRaw, hourlyRaw, alertsRaw] = await Promise.all([
    fetchJsonWithTimeout<any>(FORECAST_URL),
    fetchJsonWithTimeout<any>(HOURLY_URL),
    fetchJsonWithTimeout<any>(ALERTS_URL),
  ]);

  const rawPeriods: any[] = forecastRaw?.properties?.periods ?? [];
  const periods: ForecastDay[] = rawPeriods.slice(0, 6).map((p) => ({
    name: String(p.name ?? ''),
    tempF: Number(p.temperature ?? 40),
    isDaytime: Boolean(p.isDaytime),
    precipPct: Number(p.probabilityOfPrecipitation?.value ?? 0),
    shortForecast: String(p.shortForecast ?? 'Fair'),
    detailedForecast: String(p.detailedForecast ?? ''),
  }));

  const rawHourly: any[] = hourlyRaw?.properties?.periods ?? [];
  const hourly: HourlyPoint[] = rawHourly.slice(0, 12).map((h) => ({
    hourLabel: formatHourShort(String(h.startTime ?? '')),
    isoTime: String(h.startTime ?? ''),
    tempF: Number(h.temperature ?? 40),
    precipPct: Number(h.probabilityOfPrecipitation?.value ?? 0),
    shortForecast: String(h.shortForecast ?? 'Fair'),
    isDaytime: Boolean(h.isDaytime),
  }));

  const firstHourly = rawHourly[0];
  const firstPeriod = periods[0];

  const currentTempF = Number(
    firstHourly?.temperature ?? firstPeriod?.tempF ?? 40,
  );
  const conditions = shortenCondition(
    String(firstHourly?.shortForecast ?? firstPeriod?.shortForecast ?? 'Fair'),
  );
  const windSpeed = String(firstHourly?.windSpeed ?? rawPeriods[0]?.windSpeed ?? 'Calm');
  const windDir = String(firstHourly?.windDirection ?? rawPeriods[0]?.windDirection ?? '');
  const wind =
    windSpeed.toLowerCase().includes('calm') || windSpeed === '0 mph'
      ? 'Calm'
      : `${windDir} ${windSpeed}`.trim();

  const daytimePeriod = periods.find((p) => p.isDaytime) ?? periods[0];
  const nightPeriod = periods.find((p) => !p.isDaytime) ?? periods[1] ?? periods[0];
  const tomorrowDay =
    periods.find((p, idx) => idx > 0 && p.isDaytime) ?? periods[2] ?? daytimePeriod;

  const hourlyTemps = hourly.map((h) => h.tempF);
  const highF = daytimePeriod
    ? Math.max(daytimePeriod.tempF, ...(hourlyTemps.length ? hourlyTemps : [currentTempF]))
    : currentTempF;
  const lowF = nightPeriod
    ? Math.min(nightPeriod.tempF, ...(hourlyTemps.length ? hourlyTemps : [currentTempF]))
    : currentTempF - 10;

  const alerts: WeatherAlert[] = (alertsRaw?.features ?? [])
    .slice(0, 3)
    .map((f: any) => ({
      event: String(f?.properties?.event ?? 'Weather Advisory'),
      headline: String(f?.properties?.headline ?? f?.properties?.event ?? ''),
      severity: String(f?.properties?.severity ?? 'Moderate'),
      description: String(f?.properties?.description ?? '').slice(0, 400),
    }));

  return {
    fetchedAt: new Date().toISOString(),
    currentTempF,
    conditions,
    wind,
    highF,
    lowF,
    todayPrecipPct: daytimePeriod?.precipPct ?? 0,
    tonightPrecipPct: nightPeriod?.precipPct ?? 0,
    todaySummary: daytimePeriod
      ? `${daytimePeriod.name}: ${daytimePeriod.shortForecast}, near ${daytimePeriod.tempF}°F.`
      : `${conditions}, ${currentTempF}°F.`,
    tonightSummary: nightPeriod
      ? `${nightPeriod.name}: ${nightPeriod.shortForecast}, low around ${nightPeriod.tempF}°F.`
      : `Low near ${lowF}°F.`,
    tomorrowSummary: tomorrowDay
      ? `${tomorrowDay.name}: ${tomorrowDay.shortForecast}, high ${tomorrowDay.tempF}°F.`
      : '',
    hourly,
    periods,
    alerts,
  };
}
