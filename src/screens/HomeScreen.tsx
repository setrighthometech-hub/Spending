import { useState } from 'react'
import type { ScreenProps } from '../App'
import { adjustTo, paydayEntries, paydayEnteredThisWeek, potWeeks, setArrived } from '../logic/budget'
import { CATEGORY_NAMES, POT_NAMES, newId, type AppData, type Category, type Pot } from '../logic/data'
import { addDays, shortDate, today, weekEnd, weekStart } from '../logic/dates'
import { formatCents } from '../logic/money'
import { CATEGORY_ICON, Money, MoneyInput } from '../ui'

/** Last payday amounts, to fill the form in. Personal comes every other week, so look two weeks back. */
function usualAmounts(data: AppData, payday: string) {
  const sumOn = (pot: Pot, start: string) =>
    data.moneyIn
      .filter((m) => m.kind === 'payday' && m.pot === pot && m.date >= start && m.date <= addDays(start, 6))
      .reduce((s, m) => s + m.cents, 0)
  const lastGG = [7, 14, 21].map((n) => sumOn('groceriesGas', addDays(payday, -n))).find((c) => c > 0) ?? null
  const personal = sumOn('personal', addDays(payday, -14))
  return { groceriesGas: lastGG, personal: personal > 0 ? personal : null }
}

export default function HomeScreen({ data, update, go, edit, toast }: ScreenProps) {
  const day = today()
  const start = weekStart(day)
  const pots = potWeeks(data, day)
  const entered = paydayEnteredThisWeek(data, day)
  const waitingRows = data.moneyIn.filter((m) => !m.arrived).sort((a, b) => a.date.localeCompare(b.date))
  const todays = data.purchases.filter((p) => p.date === day)
  const [form, setForm] = useState<null | 'payday' | 'extra'>(null)
  const [adjusting, setAdjusting] = useState<Pot | null>(null)

  return (
    <>
      <header className="top">
        <h1>Spending</h1>
        <p className="muted">Week of {shortDate(start)} – {shortDate(weekEnd(day))}</p>
      </header>

      {waitingRows.length > 0 && (
        <section className="card waiting">
          <h2>Waiting on money from Joint</h2>
          <p className="muted small">Tap the box when it shows in your bank account.</p>
          {waitingRows.map((m) => (
            <div key={m.id} className="row">
              <button className="check" aria-label="Mark arrived" onClick={() => {
                update(setArrived(data, m.id, true))
                toast(`${formatCents(m.cents)} arrived`)
              }} />
              <div className="grow">
                <div>{POT_NAMES[m.pot]} {m.kind === 'extra' ? '(extra)' : ''}</div>
                <div className="muted small">{m.kind === 'payday' ? 'Payday' : 'Sent'} {shortDate(m.date)}</div>
              </div>
              <Money cents={m.cents} />
            </div>
          ))}
        </section>
      )}

      {!entered && form !== 'payday' && (
        <button className="card nudge" onClick={() => setForm('payday')}>
          <strong>Add this week's payday</strong>
          <span className="muted small">What Joint sends on payday, {shortDate(start)}</span>
        </button>
      )}
      {form === 'payday' && <PaydayForm data={data} payday={start} onDone={(next, msg) => { if (next) update(next); setForm(null); if (msg) toast(msg) }} />}
      {form === 'extra' && <ExtraForm data={data} onDone={(next, msg) => { if (next) update(next); setForm(null); if (msg) toast(msg) }} />}

      {pots.map((p) => (
        <section key={p.pot} className="card pot">
          <div className="pot-head">
            <h2>{POT_NAMES[p.pot]}</h2>
            <div className="pot-left">
              <Money cents={p.left} className="big" />
              <span className="muted small">left</span>
            </div>
          </div>
          <table className="lines">
            <tbody>
              {p.carriedIn !== 0 && <tr><td>From last week</td><td><Money cents={p.carriedIn} /></td></tr>}
              <tr><td>Came in this week</td><td><Money cents={p.cameIn} /></td></tr>
              {(Object.keys(p.spentBy) as Category[]).map((c) => (
                <tr key={c}><td>{CATEGORY_ICON[c]} {CATEGORY_NAMES[c]} spent</td><td><Money cents={-(p.spentBy[c] ?? 0)} /></td></tr>
              ))}
              {p.adjusted !== 0 && <tr><td>✎ Adjusted</td><td><Money cents={p.adjusted} /></td></tr>}
              {p.waiting > 0 && <tr className="muted"><td>Still waiting on</td><td>{formatCents(p.waiting)}</td></tr>}
            </tbody>
          </table>
          {adjusting === p.pot ? (
            <AdjustForm data={data} pot={p.pot} appLeft={p.left} onDone={(next, msg) => {
              if (next) update(next)
              setAdjusting(null)
              if (msg) toast(msg)
            }} />
          ) : (
            <button className="link" onClick={() => setAdjusting(p.pot)}>✎ Adjust total</button>
          )}
        </section>
      ))}

      <div className="actions">
        <button className="btn primary" onClick={() => go('add')}>+ Add a purchase</button>
        <button className="btn" onClick={() => setForm('extra')}>+ Extra money came in</button>
        {entered && <button className="btn" onClick={() => setForm('payday')}>+ Another payday entry</button>}
      </div>

      <section className="card">
        <h2>Today</h2>
        {todays.length === 0 && <p className="muted">Nothing spent today.</p>}
        {todays.map((p) => (
          <button key={p.id} className="row tap" onClick={() => edit(p)}>
            <span>{CATEGORY_ICON[p.category]}</span>
            <span className="grow">{p.store || 'No store'}</span>
            <Money cents={p.cents} />
          </button>
        ))}
      </section>
    </>
  )
}

type Done = (next: AppData | null, msg?: string) => void

/** "What's really left?" She types the real number; the app saves the difference as an adjustment. */
function AdjustForm({ data, pot, appLeft, onDone }: { data: AppData; pot: Pot; appLeft: number; onDone: Done }) {
  const [cents, setCents] = useState<number | null>(null)
  const [below, setBelow] = useState(false)
  const [note, setNote] = useState('')
  const actual = cents == null ? null : below ? -cents : cents
  const diff = actual == null ? null : actual - appLeft
  return (
    <div className="form adjust">
      <p className="small">The app says <strong>{formatCents(appLeft)}</strong> is left. What's really left?</p>
      <MoneyInput label={`Really left in ${POT_NAMES[pot]}`} cents={cents} onChange={setCents} autoFocus />
      <label className="checkline small">
        <input type="checkbox" checked={below} onChange={(e) => setBelow(e.target.checked)} />
        It's below $0 (I went over)
      </label>
      <label className="field">
        <span className="field-label">Why (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. forgot a receipt" />
      </label>
      {diff != null && (
        <p className="small">
          {diff === 0 ? 'That already matches. Nothing to change.' : <>This saves an adjustment of <Money cents={diff} />.</>}
        </p>
      )}
      <div className="actions">
        <button className="btn primary" disabled={actual == null || diff === 0} onClick={() => {
          const a = adjustTo(data, pot, today(), actual!, note)
          if (a) onDone({ ...data, adjustments: [...data.adjustments, a] }, `Adjusted ${POT_NAMES[pot]} to ${formatCents(actual!)}`)
        }}>Save</button>
        <button className="btn" onClick={() => onDone(null)}>Cancel</button>
      </div>
    </div>
  )
}

function PaydayForm({ data, payday, onDone }: { data: AppData; payday: string; onDone: Done }) {
  const usual = usualAmounts(data, payday)
  const [date, setDate] = useState(payday)
  const [gg, setGG] = useState<number | null>(usual.groceriesGas)
  const [personal, setPersonal] = useState<number | null>(usual.personal)
  const [arrived, setArrivedBox] = useState(false)
  const ok = (gg ?? 0) + (personal ?? 0) > 0 && gg !== undefined
  return (
    <section className="card form">
      <h2>Payday from Joint</h2>
      <MoneyInput label="Groceries & gas" cents={gg} onChange={setGG} />
      <MoneyInput label="Personal (leave empty if none this week)" cents={personal} onChange={setPersonal} />
      <label className="field">
        <span className="field-label">Payday</span>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      <label className="checkline">
        <input type="checkbox" checked={arrived} onChange={(e) => setArrivedBox(e.target.checked)} />
        It's already in my bank account
      </label>
      <div className="actions">
        <button className="btn primary" disabled={!ok} onClick={() => {
          const rows = paydayEntries(date, gg ?? 0, personal ?? 0, arrived)
          onDone({ ...data, moneyIn: [...data.moneyIn, ...rows] }, arrived ? 'Payday added' : 'Payday added — tick it when it arrives')
        }}>Save payday</button>
        <button className="btn" onClick={() => onDone(null)}>Cancel</button>
      </div>
    </section>
  )
}

function ExtraForm({ data, onDone }: { data: AppData; onDone: Done }) {
  const [cents, setCents] = useState<number | null>(null)
  const [pot, setPot] = useState<Pot>('personal')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [arrived, setArrivedBox] = useState(true)
  return (
    <section className="card form">
      <h2>Extra money</h2>
      <MoneyInput label="Amount" cents={cents} onChange={setCents} autoFocus />
      <div className="chips">
        {(['groceriesGas', 'personal'] as Pot[]).map((p) => (
          <button key={p} className={`chip ${pot === p ? 'on' : ''}`} onClick={() => setPot(p)}>{POT_NAMES[p]}</button>
        ))}
      </div>
      <label className="field">
        <span className="field-label">Date</span>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. safe to move" />
      </label>
      <label className="checkline">
        <input type="checkbox" checked={arrived} onChange={(e) => setArrivedBox(e.target.checked)} />
        It's already in my bank account
      </label>
      <div className="actions">
        <button className="btn primary" disabled={!cents} onClick={() => {
          const row = { id: newId(), date, pot, cents: cents!, kind: 'extra' as const, arrived, ...(note.trim() ? { note: note.trim() } : {}) }
          onDone({ ...data, moneyIn: [...data.moneyIn, row] }, 'Extra money added')
        }}>Save</button>
        <button className="btn" onClick={() => onDone(null)}>Cancel</button>
      </div>
    </section>
  )
}
