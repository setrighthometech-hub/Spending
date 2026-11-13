import { useState } from 'react'
import type { ScreenProps } from '../App'
import { spendingByStore } from '../logic/budget'
import type { Category } from '../logic/data'
import { addDays, today, weekEnd, weekStart } from '../logic/dates'
import { CategoryPicker, Money } from '../ui'

type Period = 'week' | 'month' | 'lastMonth' | 'all'
const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'all', label: 'All time' }
]

function range(period: Period): [string, string] {
  const t = today()
  const firstOfMonth = t.slice(0, 8) + '01'
  if (period === 'week') return [weekStart(t), weekEnd(t)]
  if (period === 'month') return [firstOfMonth, t]
  if (period === 'lastMonth') {
    const end = addDays(firstOfMonth, -1)
    return [end.slice(0, 8) + '01', end]
  }
  return ['0000-01-01', '9999-12-31']
}

/** Where the money went, store by store. */
export default function StoresScreen({ data }: ScreenProps) {
  const [period, setPeriod] = useState<Period>('month')
  const [category, setCategory] = useState<Category | null>(null)
  const [from, to] = range(period)
  const stores = spendingByStore(data.purchases, from, to, category ?? undefined)
  const total = stores.reduce((s, x) => s + x.cents, 0)

  return (
    <>
      <header className="top">
        <h1>Stores</h1>
        <p className="muted"><Money cents={total} /> spent</p>
      </header>
      <div className="chips">
        {PERIODS.map((p) => (
          <button key={p.id} className={`chip ${period === p.id ? 'on' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
        ))}
      </div>
      <CategoryPicker value={category} onChange={setCategory} all />
      <section className="card">
        {stores.length === 0 && <p className="muted">No purchases yet.</p>}
        {stores.map((s) => (
          <div key={s.store} className="row">
            <div className="grow">
              <div>{s.store}</div>
              <div className="bar"><div style={{ width: `${total ? (s.cents / stores[0].cents) * 100 : 0}%` }} /></div>
              <div className="muted small">{s.count} {s.count === 1 ? 'trip' : 'trips'}</div>
            </div>
            <Money cents={s.cents} />
          </div>
        ))}
      </section>
    </>
  )
}
