// The whole saved file and how to read it safely.
// Reading is defensive: anything damaged or unknown is dropped, never a crash.
import { isDateStr, type DateStr } from './dates'

/** 1 = first version. 2 = added adjustments (version 1 files are read fine, with none). */
export const SCHEMA_VERSION = 2

/** What a purchase was for. Tracked separately so she can see where money went. */
export const CATEGORIES = ['groceries', 'gas', 'personal', 'other'] as const
export type Category = (typeof CATEGORIES)[number]
export const CATEGORY_NAMES: Record<Category, string> = { groceries: 'Groceries', gas: 'Gas', personal: 'Personal', other: 'Other' }

/**
 * Where the money sits. The groceries + gas transfer is one pot that both
 * groceries and gas purchases come out of. Personal money is its own pot.
 */
export const POTS = ['groceriesGas', 'personal'] as const
export type Pot = (typeof POTS)[number]
export const POT_NAMES: Record<Pot, string> = { groceriesGas: 'Groceries & Gas', personal: 'Personal' }

/** Groceries, Gas and Other come out of Groceries & Gas. Only Personal comes out of Personal. */
export function potOf(category: Category): Pot {
  return category === 'personal' ? 'personal' : 'groceriesGas'
}

/** Money coming into her account: the payday transfer from Joint, or an extra. */
export interface MoneyIn {
  id: string
  /** The payday (or the day of the extra). Decides which week it belongs to. */
  date: DateStr
  pot: Pot
  cents: number
  kind: 'payday' | 'extra'
  /** Ticked when the money actually shows in her account. Not counted until then. */
  arrived: boolean
  note?: string
}

/** One purchase: what she typed in. */
export interface Purchase {
  id: string
  date: DateStr
  category: Category
  cents: number
  store: string
  note?: string
}

/**
 * A correction to a pot's total, when the app doesn't match real life.
 * `cents` is the difference (plus or minus). Kept apart from spending, so
 * spending totals stay true purchases only.
 */
export interface Adjustment {
  id: string
  date: DateStr
  pot: Pot
  cents: number
  note?: string
}

export interface AppData {
  version: number
  moneyIn: MoneyIn[]
  purchases: Purchase[]
  adjustments: Adjustment[]
}

export function emptyData(): AppData {
  return { version: SCHEMA_VERSION, moneyIn: [], purchases: [], adjustments: [] }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const isPot = (p: unknown): p is Pot => typeof p === 'string' && (POTS as readonly string[]).includes(p)
const isCategory = (c: unknown): c is Category => typeof c === 'string' && (CATEGORIES as readonly string[]).includes(c)
const isCents = (c: unknown): c is number => Number.isInteger(c) && (c as number) >= 0
const str = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim() : undefined)
const obj = (o: unknown): Record<string, unknown> | null =>
  o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null

/** Reads saved data (or a backup file) from any shape, keeping only what is valid. */
export function readData(raw: unknown): AppData {
  const out = emptyData()
  const r = obj(raw)
  if (!r) return out

  for (const x of Array.isArray(r.moneyIn) ? r.moneyIn : []) {
    const m = obj(x)
    if (!m || !isDateStr(m.date) || !isPot(m.pot) || !isCents(m.cents)) continue
    const note = str(m.note)
    out.moneyIn.push({
      id: str(m.id) ?? newId(),
      date: m.date,
      pot: m.pot,
      cents: m.cents,
      kind: m.kind === 'extra' ? 'extra' : 'payday',
      arrived: m.arrived !== false,
      ...(note ? { note } : {})
    })
  }
  for (const x of Array.isArray(r.purchases) ? r.purchases : []) {
    const p = obj(x)
    if (!p || !isDateStr(p.date) || !isCategory(p.category) || !isCents(p.cents)) continue
    const note = str(p.note)
    out.purchases.push({
      id: str(p.id) ?? newId(),
      date: p.date,
      category: p.category,
      cents: p.cents,
      store: str(p.store) ?? '',
      ...(note ? { note } : {})
    })
  }
  for (const x of Array.isArray(r.adjustments) ? r.adjustments : []) {
    const a = obj(x)
    if (!a || !isDateStr(a.date) || !isPot(a.pot) || !Number.isInteger(a.cents) || a.cents === 0) continue
    const note = str(a.note)
    out.adjustments.push({ id: str(a.id) ?? newId(), date: a.date, pot: a.pot, cents: a.cents as number, ...(note ? { note } : {}) })
  }
  return out
}
