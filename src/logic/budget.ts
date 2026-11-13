// The numbers the screens show: what's left in each pot, paydays, spending by store.
import { addDays, monthKey, weekEnd, weekStart, type DateStr } from './dates'
import { CATEGORIES, POTS, newId, potOf, type Adjustment, type AppData, type Category, type MoneyIn, type Pot, type Purchase } from './data'

export interface PotWeek {
  pot: Pot
  /** Left over from earlier weeks (can be negative if she went over). */
  carriedIn: number
  /** Money that arrived this week (ticked as arrived). */
  cameIn: number
  /** Spent this week, in total. */
  spent: number
  /** Spent this week, split by what it was for (Groceries & Gas has both). */
  spentBy: Partial<Record<Category, number>>
  /** Adjustments made this week (plus or minus). */
  adjusted: number
  /** What's left right now: carriedIn + cameIn - spent + adjusted. Money not arrived yet is not counted. */
  left: number
  /** Money expected (this week or earlier) that hasn't been ticked as arrived. */
  waiting: number
}

/** What's left in each pot for the Wednesday-to-Tuesday week holding `day`. */
export function potWeeks(data: AppData, day: DateStr): PotWeek[] {
  const start = weekStart(day)
  const end = weekEnd(day)
  return POTS.map((pot) => {
    let carriedIn = 0
    let cameIn = 0
    let spent = 0
    let waiting = 0
    const spentBy: Partial<Record<Category, number>> = {}
    for (const m of data.moneyIn) {
      if (m.pot !== pot || m.date > end) continue
      if (!m.arrived) waiting += m.cents
      else if (m.date < start) carriedIn += m.cents
      else cameIn += m.cents
    }
    for (const p of data.purchases) {
      if (potOf(p.category) !== pot || p.date > end) continue
      if (p.date < start) carriedIn -= p.cents
      else {
        spent += p.cents
        spentBy[p.category] = (spentBy[p.category] ?? 0) + p.cents
      }
    }
    let adjusted = 0
    for (const a of data.adjustments) {
      if (a.pot !== pot || a.date > end) continue
      if (a.date < start) carriedIn += a.cents
      else adjusted += a.cents
    }
    return { pot, carriedIn, cameIn, spent, spentBy, adjusted, left: carriedIn + cameIn - spent + adjusted, waiting }
  })
}

/**
 * "What's really left in this pot is $X": makes the adjustment that brings the
 * app's number to X, dated `day`. Returns null when it already matches.
 */
export function adjustTo(data: AppData, pot: Pot, day: DateStr, actualLeftCents: number, note?: string): Adjustment | null {
  const now = potWeeks(data, day).find((p) => p.pot === pot)!.left
  const diff = actualLeftCents - now
  if (diff === 0) return null
  return { id: newId(), date: day, pot, cents: diff, ...(note?.trim() ? { note: note.trim() } : {}) }
}

/** The MoneyIn rows a payday makes: groceries + gas, and personal. Pots with $0 are left out. */
export function paydayEntries(date: DateStr, groceriesGasCents: number, personalCents: number, arrived: boolean): MoneyIn[] {
  const rows: [Pot, number][] = [['groceriesGas', groceriesGasCents], ['personal', personalCents]]
  return rows
    .filter(([, cents]) => cents > 0)
    .map(([pot, cents]) => ({ id: newId(), date, pot, cents, kind: 'payday' as const, arrived }))
}

/** Ticks (or unticks) one money-in row as arrived. Returns new data; the old is left as it was. */
export function setArrived(data: AppData, id: string, arrived: boolean): AppData {
  return { ...data, moneyIn: data.moneyIn.map((m) => (m.id === id ? { ...m, arrived } : m)) }
}

export interface StoreTotal {
  store: string
  cents: number
  count: number
}

/** Spending per store between two dates (both included), biggest first. Store names match ignoring case. */
export function spendingByStore(purchases: Purchase[], from: DateStr, to: DateStr, category?: Category): StoreTotal[] {
  const totals = new Map<string, StoreTotal>()
  for (const p of purchases) {
    if (p.date < from || p.date > to || (category && p.category !== category)) continue
    const name = p.store || 'No store'
    const key = name.toLowerCase()
    const t = totals.get(key) ?? { store: name, cents: 0, count: 0 }
    t.cents += p.cents
    t.count += 1
    totals.set(key, t)
  }
  return [...totals.values()].sort((a, b) => b.cents - a.cents || a.store.localeCompare(b.store))
}

export interface DaySpending {
  date: DateStr
  total: number
  byCategory: Partial<Record<Category, number>>
  /** That day's purchases (store, amount, what for), in the order she entered them. */
  purchases: Purchase[]
}

/**
 * Day by day, newest first: every day from `from` to `to` (both included),
 * including days with nothing spent (total $0), so she sees every day.
 */
export function dailySpending(purchases: Purchase[], from: DateStr, to: DateStr, category?: Category): DaySpending[] {
  const days: DaySpending[] = []
  for (let d = to; d >= from; d = addDays(d, -1)) {
    const list = purchases.filter((p) => p.date === d && (!category || p.category === category))
    const byCategory: Partial<Record<Category, number>> = {}
    for (const p of list) byCategory[p.category] = (byCategory[p.category] ?? 0) + p.cents
    days.push({ date: d, total: list.reduce((s, p) => s + p.cents, 0), byCategory, purchases: list })
  }
  return days
}

/** Stores she has typed before, most used first, so she can tap instead of type. */
export function knownStores(purchases: Purchase[], category?: Category): string[] {
  const seen = new Map<string, { name: string; count: number; last: DateStr }>()
  for (const p of purchases) {
    if (!p.store || (category && p.category !== category)) continue
    const key = p.store.toLowerCase()
    const s = seen.get(key)
    if (!s) seen.set(key, { name: p.store, count: 1, last: p.date })
    else {
      s.count += 1
      if (p.date >= s.last) { s.last = p.date; s.name = p.store }
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .map((s) => s.name)
}

/** Totals for one calendar month ("2026-11"): money in per pot (arrived only), spent per category, adjustments per pot. */
export function monthSummary(data: AppData, month: string) {
  const cameIn = Object.fromEntries(POTS.map((pot) => [pot,
    data.moneyIn.filter((m) => m.arrived && m.pot === pot && monthKey(m.date) === month).reduce((s, m) => s + m.cents, 0)
  ])) as Record<Pot, number>
  const spent = Object.fromEntries(CATEGORIES.map((c) => [c,
    data.purchases.filter((p) => p.category === c && monthKey(p.date) === month).reduce((s, p) => s + p.cents, 0)
  ])) as Record<Category, number>
  const adjusted = Object.fromEntries(POTS.map((pot) => [pot,
    data.adjustments.filter((a) => a.pot === pot && monthKey(a.date) === month).reduce((s, a) => s + a.cents, 0)
  ])) as Record<Pot, number>
  return { cameIn, spent, adjusted }
}

/** True if a payday entry already exists in the week holding `day` (to warn about entering it twice). */
export function paydayEnteredThisWeek(data: AppData, day: DateStr): boolean {
  const start = weekStart(day)
  const end = weekEnd(day)
  return data.moneyIn.some((m) => m.kind === 'payday' && m.date >= start && m.date <= end)
}
