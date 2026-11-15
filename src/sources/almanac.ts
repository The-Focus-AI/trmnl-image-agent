import { CORNWALL_TZ, computeDaypart, getCornwallClock } from '../seasonal.js';
import type { AlmanacData, Daypart } from '../types.js';

const CORNWALL_LAT = 41.8456;
const CORNWALL_LON = -73.3284;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * NOAA solar equations returning UTC Date objects for sunrise and sunset on a given YYYY-MM-DD.
 */
function computeSunTimesUtc(
  year: number,
  month: number,
  day: number,
): { sunriseUtc: Date; sunsetUtc: Date; dayLengthSeconds: number } {
  const dayOfYear = Math.floor(
    (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86_400_000,
  );
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);

  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const cosHa =
    Math.cos(90.833 * DEG) / (Math.cos(CORNWALL_LAT * DEG) * Math.cos(decl)) -
    Math.tan(CORNWALL_LAT * DEG) * Math.tan(decl);

  const clamped = Math.max(-1, Math.min(1, cosHa));
  const haDeg = Math.acos(clamped) * RAD;

  const sunriseMinUtc = 720 - 4 * (CORNWALL_LON + haDeg) - eqTime;
  const sunsetMinUtc = 720 - 4 * (CORNWALL_LON - haDeg) - eqTime;
  const baseUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0);

  return {
    sunriseUtc: new Date(baseUtcMs + sunriseMinUtc * 60_000),
    sunsetUtc: new Date(baseUtcMs + sunsetMinUtc * 60_000),
    dayLengthSeconds: Math.round((sunsetMinUtc - sunriseMinUtc) * 60),
  };
}

function formatEtClock(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CORNWALL_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function computeMoonPhase(now: Date): {
  name: string;
  fraction: number;
  illuminationPct: number;
} {
  // Reference known New Moon: 2000-01-06 18:14 UTC
  const synodicDays = 29.530588853;
  const refMs = Date.UTC(2000, 0, 6, 18, 14, 0);
  const elapsedDays = (now.getTime() - refMs) / 86_400_000;
  const fraction = ((elapsedDays % synodicDays) + synodicDays) % synodicDays / synodicDays;
  const illuminationPct = Math.round(((1 - Math.cos(2 * Math.PI * fraction)) / 2) * 100);

  let name = 'Waxing Crescent';
  if (fraction < 0.03 || fraction > 0.97) name = 'New Moon';
  else if (fraction < 0.22) name = 'Waxing Crescent';
  else if (fraction < 0.28) name = 'First Quarter';
  else if (fraction < 0.47) name = 'Waxing Gibbous';
  else if (fraction < 0.53) name = 'Full Moon';
  else if (fraction < 0.72) name = 'Waning Gibbous';
  else if (fraction < 0.78) name = 'Last Quarter';
  else name = 'Waning Crescent';

  return { name, fraction: Number(fraction.toFixed(3)), illuminationPct };
}

function phenologyForDate(month: number, day: number): string {
  if (month === 1) {
    return 'Deep midwinter across Cream Hill & Mohawk Ridge; barred owls vocalize at dusk and chickadees flock to hemlock shelter.';
  }
  if (month === 2) {
    return day < 18
      ? 'Lengthening afternoon light on south-facing stone walls; black-capped chickadees begin their two-note spring fee-bee whistle.'
      : 'First freeze-thaw afternoons stir sugar maples while red-winged blackbirds scout thawed marsh edges.';
  }
  if (month === 3) {
    return day < 18
      ? 'Sugarhouse steam season in the Litchfield Hills; skunk cabbage melts through wet seeps along Mill Brook.'
      : 'Vernal pools waking in Cornwall woods — listen for wood frogs and the first chorus of spring peepers on damp evenings.';
  }
  if (month === 4) {
    return day < 16
      ? 'Trout season waters rushing through West Cornwall Covered Bridge; phoebes return under barn eaves.'
      : 'Shadbush and red maple bloom across the hills while ramps carpet rich wooded hollows.';
  }
  if (month === 5) {
    return 'Warbler migration peaks in Cathedral Pines & Mohawk State Forest; orioles and rose-breasted grosbeaks back in town.';
  }
  if (month === 6) {
    return 'Mountain laurel — Connecticut’s state flower — opening along shaded Cornwall ledges; fireflies rising over hayfields at dusk.';
  }
  if (month === 7) {
    return 'High summer on Cream Hill Lake and the Housatonic; wild bergamot, milkweed, and blackberries ripening on sunny lanes.';
  }
  if (month === 8) {
    return 'Cool valley fog lifts off the Housatonic at dawn; katydids and crickets take over the evening chorus.';
  }
  if (month === 9) {
    return 'Swamp maples flare scarlet first in the wetlands while broad-winged hawks ride thermals down the Appalachian ridge.';
  }
  if (month === 10) {
    return 'Peak hardwood color across Cornwall hills; goldenrod seedheads feed migrating sparrows and crisp nights clear the stars.';
  }
  if (month === 11) {
    return day < 18
      ? 'Stick season in the Northwest Corner: black and grey squirrels shake-testing winter acorns while tree frogs tuck under leaf litter.'
      : 'Bare stone-wall vistas open through the woods; Canada geese pass high overhead ahead of early 4:30 PM twilight.';
  }
  return 'Early dusk settles over the Covered Bridge and Pine Street; evergreens, birch bark, and woodsmoke define the December hills.';
}

export function buildAlmanacData(
  now: Date = new Date(),
  daypartOverride?: string | null,
): AlmanacData {
  const clock = getCornwallClock(now);
  const daypart: Daypart = computeDaypart(clock, daypartOverride);

  const todaySun = computeSunTimesUtc(clock.year, clock.month, clock.day);
  const yesterdayUtc = new Date(Date.UTC(clock.year, clock.month - 1, clock.day - 1));
  const ySun = computeSunTimesUtc(
    yesterdayUtc.getUTCFullYear(),
    yesterdayUtc.getUTCMonth() + 1,
    yesterdayUtc.getUTCDate(),
  );

  const deltaSec = todaySun.dayLengthSeconds - ySun.dayLengthSeconds;
  const absSec = Math.abs(deltaSec);
  const dMin = Math.floor(absSec / 60);
  const dSec = absSec % 60;
  const sign = deltaSec >= 0 ? '+' : '−';
  const daylightDeltaLabel = `${sign}${dMin}m ${String(dSec).padStart(2, '0')}s`;

  const hours = Math.floor(todaySun.dayLengthSeconds / 3600);
  const mins = Math.round((todaySun.dayLengthSeconds % 3600) / 60);
  const dayLengthLabel = `${hours}h ${mins}m`;

  const moon = computeMoonPhase(now);

  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: CORNWALL_TZ,
    weekday: 'short',
  })
    .format(now)
    .toUpperCase();

  const weekdayLong = new Intl.DateTimeFormat('en-US', {
    timeZone: CORNWALL_TZ,
    weekday: 'long',
  }).format(now);

  const monthDayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: CORNWALL_TZ,
    month: 'short',
    day: 'numeric',
  })
    .format(now)
    .toUpperCase();

  const fullDateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: CORNWALL_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
    .format(now)
    .toUpperCase();

  return {
    dateIso: clock.dateIso,
    weekdayShort,
    weekdayLong,
    monthDayLabel,
    fullDateLabel,
    editionTimeLabel: formatEtClock(now),
    daypart,
    sunrise: formatEtClock(todaySun.sunriseUtc),
    sunset: formatEtClock(todaySun.sunsetUtc),
    dayLengthLabel,
    daylightDeltaLabel,
    moonPhaseName: moon.name,
    moonIlluminationPct: moon.illuminationPct,
    moonPhaseFraction: moon.fraction,
    phenologyNote: phenologyForDate(clock.month, clock.day),
  };
}
