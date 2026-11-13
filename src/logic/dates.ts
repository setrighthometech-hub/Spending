// Dates are "YYYY-MM-DD" strings (like "2026-11-13"). Math is done in UTC so
// daylight-saving changes never shift a day.

export type DateStr = string

const toUtc = (d: DateStr) => {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}
const fromUtc = (ms: number): DateStr => new Date(ms).toISOString().slice(0, 10)

export function isDateStr(d: unknown): d is DateStr {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && fromUtc(toUtc(d)) === d
}

/** Today's date on this phone, in its own time zone. */
export function today(now = new Date()): DateStr {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

export function addDays(d: DateStr, n: number): DateStr {
  return fromUtc(toUtc(d) + n * 86_400_000)
}

/** 0 = Sunday ... 3 = Wednesday ... 6 = Saturday */
export function weekday(d: DateStr): number {
  return new Date(toUtc(d)).getUTCDay()
}

/** The payday week runs Wednesday to Tuesday. Returns the Wednesday that starts the week holding `d`. */
export function weekStart(d: DateStr): DateStr {
  return addDays(d, -((weekday(d) - 3 + 7) % 7))
}

export function weekEnd(d: DateStr): DateStr {
  return addDays(weekStart(d), 6)
}

/** "2026-11-13" -> "2026-11" */
export function monthKey(d: DateStr): string {
  return d.slice(0, 7)
}

/** "2026-11-13" -> "Fri Nov 13" */
export function shortDate(d: DateStr): string {
  return new Date(toUtc(d)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'
  })
}
