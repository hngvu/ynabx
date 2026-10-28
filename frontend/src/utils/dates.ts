const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Returns the first day of the current month in YYYY-MM-01 format using local time.
 * Never uses toISOString() to avoid UTC date shift near month/year boundaries.
 */
export function getCurrentMonthIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Returns today's date in YYYY-MM-DD format using local time.
 */
export function getTodayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Adds or subtracts `deltaMonths` from a YYYY-MM-01 string and returns YYYY-MM-01.
 */
export function addMonths(monthIso: string, deltaMonths: number): string {
  const parts = monthIso.split("-");
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const totalMonths = year * 12 + monthIndex + deltaMonths;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonthIndex = ((totalMonths % 12) + 12) % 12;
  const nextMonth = String(nextMonthIndex + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}-01`;
}

/**
 * Formats a YYYY-MM-01 string into e.g. "Oct 2026".
 */
export function formatMonthLabel(monthIso: string): string {
  const parts = monthIso.split("-");
  const year = parts[0] ?? "";
  const monthIndex = Number(parts[1]) - 1;
  const monthName = MONTH_SHORT_NAMES[monthIndex] ?? parts[1] ?? "";
  return `${monthName} ${year}`;
}

/**
 * Extracts the YYYY-MM-01 month string from a YYYY-MM-DD transaction date.
 */
export function getMonthIsoFromDate(dateIso: string): string {
  const slice = dateIso.slice(0, 7);
  return `${slice}-01`;
}
