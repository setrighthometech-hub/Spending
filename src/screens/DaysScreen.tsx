import { useState } from 'react'
import type { ScreenProps } from '../App'
import { dailySpending } from '../logic/budget'
import { CATEGORY_NAMES, POT_NAMES, type Category } from '../logic/data'
import { addDays, shortDate, today, weekStart } from '../logic/dates'
import { CATEGORY_ICON, CategoryPicker, Money } from '../ui'

/** Day by day: each day's total and every purchase (store, what for, amount). Tap one to change it. */
export default function DaysScreen({ data, edit }: ScreenProps) {
  const [category, setCategory] = useState<Category | null>(null)
  const [weeks, setWeeks] = useState(2)
  const to = today()
  const from = addDays(weekStart(to), -7 * (weeks - 1))
  const days = dailySpending(data.purchases, from, to, category ?? undefined)
  const total = days.reduce((s, d) => s + d.total, 0)

  return (
    <>
      <header className="top">
        <h1>Day by day</h1>
        <p className="muted">{shortDate(from)} – {shortDate(to)}: <Money cents={total} /> spent</p>
      </header>
      <CategoryPicker value={category} onChange={setCategory} all />
      {days.map((d) => (
        <section key={d.date} className={`card day ${d.date === weekStart(d.date) ? 'payday' : ''}`}>
          <div className="day-head">
            <strong>{d.date === to ? 'Today' : shortDate(d.date)}</strong>
            {d.date === weekStart(d.date) && <span className="tag">Payday</span>}
            <span className="grow" />
            <Money cents={d.total} />
          </div>
          {d.purchases.map((p) => (
            <button key={p.id} className="row tap" onClick={() => edit(p)}>
              <span aria-label={CATEGORY_NAMES[p.category]}>{CATEGORY_ICON[p.category]}</span>
              <span className="grow">
                {p.store || 'No store'}
                {p.note && <span className="muted small"> · {p.note}</span>}
              </span>
              <Money cents={p.cents} />
            </button>
          ))}
          {category === null && data.adjustments.filter((a) => a.date === d.date).map((a) => (
            <div key={a.id} className="row muted">
              <span>✎</span>
              <span className="grow">
                {POT_NAMES[a.pot]} adjusted
                {a.note && <span className="small"> · {a.note}</span>}
              </span>
              <Money cents={a.cents} />
            </div>
          ))}
        </section>
      ))}
      <button className="btn wide" onClick={() => setWeeks(weeks + 2)}>Show 2 more weeks</button>
    </>
  )
}
