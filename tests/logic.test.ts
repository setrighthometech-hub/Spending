import { describe, expect, it } from 'vitest'
import { formatCents, parseDollars } from '../src/logic/money'
import { addDays, isDateStr, weekEnd, weekStart } from '../src/logic/dates'
import { emptyData, readData, type AppData } from '../src/logic/data'
import {
  adjustTo, dailySpending, knownStores, monthSummary, paydayEntries, paydayEnteredThisWeek, potWeeks, setArrived, spendingByStore
} from '../src/logic/budget'

// Worked example, using made-up amounts: 11/11/2026 and 11/18/2026 are Wednesdays (paydays).
function example(): AppData {
  const d = emptyData()
  d.moneyIn.push(...paydayEntries('2026-11-11', 19400, 5600, true))
  d.purchases.push(
    { id: 'a', date: '2026-11-12', category: 'groceries', cents: 8217, store: 'Aldi' },
    { id: 'b', date: '2026-11-14', category: 'gas', cents: 3810, store: 'Speedway' },
    { id: 'c', date: '2026-11-15', category: 'personal', cents: 1250, store: 'Target' },
    { id: 'd', date: '2026-11-16', category: 'groceries', cents: 4500, store: 'aldi' },
    { id: 'e', date: '2026-11-19', category: 'groceries', cents: 6000, store: 'Walmart' }
  )
  return d
}
const pot = (d: AppData, day: string, name: string) => potWeeks(d, day).find((p) => p.pot === name)!

describe('money', () => {
  it('reads typed amounts as cents', () => {
    expect(parseDollars('42.17')).toBe(4217)
    expect(parseDollars('$1,234.5')).toBe(123450)
    expect(parseDollars('7')).toBe(700)
    expect(parseDollars('.99')).toBe(99)
    expect(parseDollars('4.123')).toBeNull()
    expect(parseDollars('abc')).toBeNull()
    expect(parseDollars('')).toBeNull()
  })
  it('shows cents as dollars', () => {
    expect(formatCents(4217)).toBe('$42.17')
    expect(formatCents(-500)).toBe('-$5.00')
    expect(formatCents(123456)).toBe('$1,234.56')
  })
})

describe('dates', () => {
  it('payday week runs Wednesday to Tuesday', () => {
    expect(weekStart('2026-11-11')).toBe('2026-11-11') // Wednesday
    expect(weekStart('2026-11-13')).toBe('2026-11-11') // Friday
    expect(weekStart('2026-11-17')).toBe('2026-11-11') // Tuesday
    expect(weekStart('2026-11-18')).toBe('2026-11-18') // next Wednesday
    expect(weekEnd('2026-11-13')).toBe('2026-11-17')
  })
  it('crosses months and checks dates', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(isDateStr('2026-02-30')).toBe(false)
    expect(isDateStr('2026-11-13')).toBe(true)
  })
})

describe('payday', () => {
  it('groceries + gas is one pot, personal another; $0 pots left out', () => {
    expect(paydayEntries('2026-11-11', 19400, 5600, true).map((r) => [r.pot, r.cents])).toEqual([
      ['groceriesGas', 19400], ['personal', 5600]
    ])
    expect(paydayEntries('2026-11-18', 16500, 0, false).map((r) => [r.pot, r.cents, r.arrived])).toEqual([
      ['groceriesGas', 16500, false]
    ])
  })
})

describe("what's left", () => {
  it('groceries and gas both come out of the Groceries & Gas pot, tracked apart', () => {
    expect(pot(example(), '2026-11-13', 'groceriesGas')).toEqual({
      pot: 'groceriesGas', carriedIn: 0, cameIn: 19400, spent: 16527,
      spentBy: { groceries: 12717, gas: 3810 }, adjusted: 0, left: 2873, waiting: 0
    })
    expect(pot(example(), '2026-11-13', 'personal').left).toBe(4350)
  })
  it('payday money not arrived yet is shown as waiting, not counted', () => {
    const d = example()
    d.moneyIn.push(...paydayEntries('2026-11-18', 16500, 0, false))
    const w = pot(d, '2026-11-19', 'groceriesGas')
    expect(w).toMatchObject({ carriedIn: 2873, cameIn: 0, spent: 6000, left: -3127, waiting: 16500 })
  })
  it('ticking arrived counts it in the payday week', () => {
    const d = example()
    d.moneyIn.push(...paydayEntries('2026-11-18', 16500, 0, false))
    const id = d.moneyIn[d.moneyIn.length - 1].id
    const after = setArrived(d, id, true)
    expect(pot(after, '2026-11-19', 'groceriesGas')).toMatchObject({ cameIn: 16500, left: 13373, waiting: 0 })
    expect(d.moneyIn[d.moneyIn.length - 1].arrived).toBe(false) // old data untouched
  })
  it('Other comes out of Groceries & Gas but is tracked as Other', () => {
    const d = example()
    d.purchases.push({ id: 'o', date: '2026-11-13', category: 'other', cents: 900, store: 'Dollar Tree' })
    expect(pot(d, '2026-11-13', 'groceriesGas')).toMatchObject({
      spent: 17427, spentBy: { groceries: 12717, gas: 3810, other: 900 }, left: 1973
    })
    expect(pot(d, '2026-11-13', 'personal').left).toBe(4350)
    expect(monthSummary(d, '2026-11').spent.other).toBe(900)
  })
  it('leftovers carry into next week', () => {
    expect(pot(example(), '2026-11-20', 'personal')).toMatchObject({ carriedIn: 4350, cameIn: 0, spent: 0, left: 4350 })
  })
  it('going over shows a negative number that carries', () => {
    const d = example()
    d.purchases.push({ id: 'x', date: '2026-11-17', category: 'personal', cents: 5000, store: 'Shell' })
    expect(pot(d, '2026-11-17', 'personal').left).toBe(-650)
    expect(pot(d, '2026-11-18', 'personal').carriedIn).toBe(-650)
  })
})

describe('adjustments', () => {
  it('"really left is $X" makes the difference as an adjustment', () => {
    const d = example()
    // App says $28.73 left in Groceries & Gas on Fri 11/13; her real number is $20.00.
    const a = adjustTo(d, 'groceriesGas', '2026-11-13', 2000, 'forgot a receipt')!
    expect(a).toMatchObject({ date: '2026-11-13', pot: 'groceriesGas', cents: -873, note: 'forgot a receipt' })
    d.adjustments.push(a)
    const w = pot(d, '2026-11-13', 'groceriesGas')
    expect(w).toMatchObject({ adjusted: -873, left: 2000, spent: 16527 }) // spending unchanged
  })
  it('can adjust upward too, and nothing is made when it already matches', () => {
    const d = example()
    expect(adjustTo(d, 'personal', '2026-11-13', 5000)!.cents).toBe(650)
    expect(adjustTo(d, 'personal', '2026-11-13', 4350)).toBeNull()
  })
  it('adjustments carry into next week like everything else', () => {
    const d = example()
    d.adjustments.push({ id: 'j', date: '2026-11-13', pot: 'personal', cents: -350 })
    expect(pot(d, '2026-11-20', 'personal')).toMatchObject({ carriedIn: 4000, adjusted: 0, left: 4000 })
  })
})

describe('stores', () => {
  it('totals by store, ignoring upper/lower case, biggest first', () => {
    const t = spendingByStore(example().purchases, '2026-11-01', '2026-11-30')
    expect(t[0]).toEqual({ store: 'Aldi', cents: 12717, count: 2 })
    expect(t.map((s) => s.store)).toEqual(['Aldi', 'Walmart', 'Speedway', 'Target'])
  })
  it('can look at one category only', () => {
    expect(spendingByStore(example().purchases, '2026-11-01', '2026-11-30', 'gas')).toEqual([
      { store: 'Speedway', cents: 3810, count: 1 }
    ])
  })
  it('remembers stores, most used first', () => {
    expect(knownStores(example().purchases, 'groceries')).toEqual(['aldi', 'Walmart'])
  })
})

describe('day by day', () => {
  it('every day newest first, with stores and totals, $0 days included', () => {
    const days = dailySpending(example().purchases, '2026-11-12', '2026-11-16')
    expect(days.map((d) => [d.date, d.total])).toEqual([
      ['2026-11-16', 4500], ['2026-11-15', 1250], ['2026-11-14', 3810], ['2026-11-13', 0], ['2026-11-12', 8217]
    ])
    expect(days[0].purchases.map((p) => p.store)).toEqual(['aldi'])
    expect(days[2].byCategory).toEqual({ gas: 3810 })
  })
  it('can show one category only', () => {
    const days = dailySpending(example().purchases, '2026-11-12', '2026-11-16', 'gas')
    expect(days.filter((d) => d.total > 0).map((d) => d.date)).toEqual(['2026-11-14'])
  })
})

describe('month and payday checks', () => {
  it('month totals: money in per pot (arrived only), spent per category', () => {
    const d = example()
    d.moneyIn.push(...paydayEntries('2026-11-18', 16500, 0, false))
    d.adjustments.push({ id: 'j', date: '2026-11-20', pot: 'personal', cents: -300 })
    expect(monthSummary(d, '2026-11')).toEqual({
      cameIn: { groceriesGas: 19400, personal: 5600 },
      spent: { groceries: 18717, gas: 3810, personal: 1250, other: 0 },
      adjusted: { groceriesGas: 0, personal: -300 }
    })
  })
  it('knows if payday was already entered this week', () => {
    expect(paydayEnteredThisWeek(example(), '2026-11-13')).toBe(true)
    expect(paydayEnteredThisWeek(example(), '2026-11-25')).toBe(false)
  })
})

describe('reading saved data', () => {
  it('keeps good rows and drops damaged ones', () => {
    const d = readData({
      moneyIn: [
        { id: '1', date: '2026-11-11', pot: 'groceriesGas', cents: 4000, kind: 'payday', arrived: false },
        { id: '3', date: '2026-11-11', pot: 'personal', cents: 100 },
        { date: 'bad', pot: 'personal', cents: 1 }
      ],
      purchases: [
        { id: '2', date: '2026-11-12', category: 'groceries', cents: 999, store: ' Aldi ' },
        { date: '2026-11-12', category: 'shoes', cents: 5 },
        { date: '2026-11-12', category: 'gas', cents: 1.5 }
      ]
    })
    expect(d.moneyIn.map((m) => [m.id, m.arrived])).toEqual([['1', false], ['3', true]])
    expect(d.purchases).toEqual([{ id: '2', date: '2026-11-12', category: 'groceries', cents: 999, store: 'Aldi' }])
    expect(d.adjustments).toEqual([])
  })
  it('reads adjustments (minus allowed), drops bad ones', () => {
    const d = readData({
      adjustments: [
        { id: 'a', date: '2026-11-13', pot: 'personal', cents: -350, note: 'fix' },
        { id: 'b', date: '2026-11-13', pot: 'personal', cents: 0 },
        { id: 'c', date: '2026-11-13', pot: 'personal', cents: 1.5 },
        { id: 'd', date: '2026-11-13', pot: 'shoes', cents: 100 }
      ]
    })
    expect(d.adjustments).toEqual([{ id: 'a', date: '2026-11-13', pot: 'personal', cents: -350, note: 'fix' }])
  })
  it('never crashes on junk', () => {
    expect(readData(null)).toEqual(emptyData())
    expect(readData('hello')).toEqual(emptyData())
    expect(readData({ moneyIn: 'x', purchases: 5 })).toEqual(emptyData())
  })
})
