/**
 * Timezone and Date helper functions for midnight reset and local time calculations
 */

export function getUserTimezone(customTz?: string): string {
  if (customTz && customTz.trim() !== '') {
    return customTz.trim();
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    return 'UTC';
  }
}

/**
 * Returns date in YYYY-MM-DD format for a given ISO timestamp in the specified timezone
 */
export function getDateStringInTimezone(timestamp: string | Date, timezone: string): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // Returns YYYY-MM-DD
}

/**
 * Returns today's date in YYYY-MM-DD in the specified timezone
 */
export function getTodayString(timezone: string): string {
  return getDateStringInTimezone(new Date(), timezone);
}

/**
 * Format time for display (e.g. 08:35 AM or 20:35)
 */
export function formatTimeInTimezone(timestamp: string | Date, timezone: string, is24h: boolean = false): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: !is24h,
  }).format(d);
}

/**
 * Format full date for display (e.g. "Saturday, Nov 7")
 */
export function formatDateInTimezone(timestamp: string | Date, timezone: string): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Calculate humanized time until next midnight (00:00:00) in the given timezone
 */
export function getTimeUntilMidnight(timezone: string): { hours: number; minutes: number; formatted: string } {
  try {
    // Current time in timezone
    const now = new Date();
    const nowParts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(now);

    let h = 0, m = 0, s = 0;
    for (const part of nowParts) {
      if (part.type === 'hour') h = parseInt(part.value, 10);
      if (part.type === 'minute') m = parseInt(part.value, 10);
      if (part.type === 'second') s = parseInt(part.value, 10);
    }

    const currentSecondsIntoDay = h * 3600 + m * 60 + s;
    const totalSecondsInDay = 86400;
    const remainingSeconds = totalSecondsInDay - currentSecondsIntoDay;

    const remainingHours = Math.floor(remainingSeconds / 3600);
    const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);

    return {
      hours: remainingHours,
      minutes: remainingMinutes,
      formatted: `${remainingHours}h ${remainingMinutes}m`,
    };
  } catch (err) {
    return { hours: 0, minutes: 0, formatted: '--' };
  }
}

/**
 * Calculate time elapsed since a dose (e.g. "2h 15m ago")
 */
export function getTimeElapsed(timestamp: string): string {
  const now = Date.now();
  const doseTime = new Date(timestamp).getTime();
  const diffSec = Math.max(0, Math.floor((now - doseTime) / 1000));

  if (diffSec < 60) {
    return 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  const remainingMins = diffMin % 60;
  if (diffHours < 24) {
    return remainingMins > 0 ? `${diffHours}h ${remainingMins}m ago` : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Calculate interval between two timestamps (e.g. "4h 20m later")
 */
export function getIntervalBetween(t1: string, t2: string): string {
  const d1 = new Date(t1).getTime();
  const d2 = new Date(t2).getTime();
  const diffMs = Math.abs(d2 - d1);
  const diffMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours === 0) return `${mins}m`;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
