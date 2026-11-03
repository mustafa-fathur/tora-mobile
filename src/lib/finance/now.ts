// "Now" in Asia/Jakarta for new transactions, with a fallback in case the phone's
// JavaScript engine formats dates differently from Node/browsers.
import { isIsoDate, isTime, nowTime, today } from '@/lib/finance/dates';

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no daylight saving

/** Date and time in Jakarta for a given moment, without Intl. */
export function jakartaParts(at: Date) {
  const iso = new Date(at.getTime() + JAKARTA_OFFSET_MS).toISOString(); // 2026-11-03T19:30:00.000Z
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** Today's date (YYYY-MM-DD) and the current time (HH:MM) in Jakarta. */
export function jakartaNow(): { date: string; time: string } {
  try {
    const date = today();
    const time = nowTime();
    if (isIsoDate(date) && isTime(time)) return { date, time };
  } catch {
    // fall through
  }
  return jakartaParts(new Date());
}

/** "2026-11-03", -1 -> "2026-11-02" */
export function shiftDay(date: string, delta: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
