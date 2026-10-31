import { MarketType } from '../types/stock';

export interface MarketTimeInfo {
  timeStr: string;
  dateStr: string;
  sessionStatus: string;
  isOpen: boolean;
  isPreOrPost: boolean;
  timeZoneAbbr: string;
  nextEvent: string;
}

/**
 * Calculates current market session status for 24/7 Global Crypto Market
 */
export function getCryptoMarketTime(now: Date = new Date(), lang: 'ID' | 'EN' = 'ID'): MarketTimeInfo {
  const isEn = lang === 'EN';
  // Format localized UTC & WIB time
  const wibParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);

  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcTotalMinutes = utcHours * 60 + utcMinutes;

  const getPart = (type: string) => wibParts.find((p) => p.type === type)?.value || '00';
  const timeStr = `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

  const dateStr = new Intl.DateTimeFormat(isEn ? 'en-US' : 'id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now);

  // Global Trading Sessions based on UTC
  let sessionStatus = isEn ? '24/7 Global Session' : 'Sesi Global 24/7';
  if (utcHours >= 0 && utcHours < 8) {
    sessionStatus = isEn ? 'Asian Session (Tokyo & SG)' : 'Sesi Asia (Tokyo & SG)';
  } else if (utcHours >= 8 && utcHours < 13) {
    sessionStatus = isEn ? 'European Session (London)' : 'Sesi Eropa (London)';
  } else if (utcHours >= 13 && utcHours < 16) {
    sessionStatus = isEn ? 'London-New York Overlap (Peak Vol)' : 'Overlap London-New York (Peak Vol)';
  } else if (utcHours >= 16 && utcHours < 21) {
    sessionStatus = isEn ? 'US Session (New York)' : 'Sesi AS (New York)';
  } else {
    sessionStatus = isEn ? 'Pacific / Pre-Asia Session' : 'Sesi Pasifik / Pra-Asia';
  }

  // Next Funding Rate Settlement (00:00, 08:00, 16:00 UTC)
  const fundingHours = [0, 8, 16, 24];
  let nextFundingHour = fundingHours.find((h) => h * 60 > utcTotalMinutes) ?? 24;
  let minutesToFunding = nextFundingHour * 60 - utcTotalMinutes;
  if (minutesToFunding < 0) minutesToFunding += 24 * 60;

  const hoursRemaining = Math.floor(minutesToFunding / 60);
  const minsRemaining = minutesToFunding % 60;
  const nextEvent = isEn
    ? `Funding 8h in ${hoursRemaining}h ${minsRemaining}m`
    : `Funding 8j dlm ${hoursRemaining}j ${minsRemaining}m`;

  return {
    timeStr,
    dateStr,
    sessionStatus,
    isOpen: true,
    isPreOrPost: false,
    timeZoneAbbr: isEn ? 'WIB (UTC+7)' : 'WIB (24/7)',
    nextEvent,
  };
}

/**
 * Backward compatibility alias
 */
export const getIDXMarketTime = getCryptoMarketTime;

/**
 * Calculates current market session status and localized time for US (New York, ET)
 */
export function getUSMarketTime(now: Date = new Date()): MarketTimeInfo {
  const nyParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  }).formatToParts(now);

  const getPart = (type: string) => nyParts.find((p) => p.type === type)?.value || '';

  const weekday = getPart('weekday');
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);
  const totalMinutes = hour * 60 + minute;

  const timeStr = `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now);

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  let sessionStatus = 'Bursa Tutup';
  let isOpen = false;
  let isPreOrPost = false;
  let nextEvent = 'Buka 09:30 ET';

  if (isWeekend) {
    sessionStatus = 'Tutup (Weekend)';
    nextEvent = 'Buka Senin 09:30 ET';
  } else {
    // Regular Trading Hours: 09:30 - 16:00 ET
    if (totalMinutes < 4 * 60) {
      sessionStatus = 'Bursa Tutup (Malam)';
      nextEvent = `Pre-Market dlm ${formatMinutesRemaining(4 * 60 - totalMinutes)}`;
    } else if (totalMinutes >= 4 * 60 && totalMinutes < 9 * 60 + 30) {
      sessionStatus = 'Pre-Market US';
      isPreOrPost = true;
      nextEvent = `Bel Pembukaan dlm ${formatMinutesRemaining(9 * 60 + 30 - totalMinutes)}`;
    } else if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60) {
      sessionStatus = 'Regular Hours (Open)';
      isOpen = true;
      nextEvent = `Penutupan dlm ${formatMinutesRemaining(16 * 60 - totalMinutes)}`;
    } else if (totalMinutes >= 16 * 60 && totalMinutes < 20 * 60) {
      sessionStatus = 'After-Hours US';
      isPreOrPost = true;
      nextEvent = `Tutup Akhir dlm ${formatMinutesRemaining(20 * 60 - totalMinutes)}`;
    } else {
      sessionStatus = 'Bursa Tutup';
      nextEvent = 'Pre-Market Esok 04:00 ET';
    }
  }

  return {
    timeStr,
    dateStr,
    sessionStatus,
    isOpen,
    isPreOrPost,
    timeZoneAbbr: 'ET (New York)',
    nextEvent,
  };
}

function formatMinutesRemaining(mins: number): string {
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) {
    return `${h}j ${m}m`;
  }
  return `${m}m`;
}

export function getDualMarketClocks(): {
  crypto: MarketTimeInfo;
  us: MarketTimeInfo;
} {
  return {
    crypto: getCryptoMarketTime(),
    us: getUSMarketTime(),
  };
}

/**
 * Formats a localized timestamp matching the active market timezone (WIB or ET)
 */
export function formatLocalizedMarketTimestamp(
  date: Date = new Date(),
  market: MarketType = 'CRYPTO',
  showDualTimezone: boolean = true
): string {
  const isUS = market === 'US';
  const timeZone = isUS ? 'America/New_York' : 'Asia/Jakarta';
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  const tzLabel = isUS ? 'ET' : 'WIB';
  if (showDualTimezone && isUS) {
    const wibStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return `${timeStr} ${tzLabel} / ${wibStr} WIB`;
  }
  return `${timeStr} ${tzLabel}`;
}

