import { useRef, useState } from 'react'
import type { ScreenProps } from '../App'
import { monthSummary, setArrived } from '../logic/budget'
import { CATEGORIES, CATEGORY_NAMES, POTS, POT_NAMES, type AppData, type MoneyIn, type Pot } from '../logic/data'
import { shortDate, today } from '../logic/dates'
import { formatCents } from '../logic/money'
import { backup, readBackup } from '../storage'
import { CATEGORY_ICON, Money, MoneyInput } from '../ui'

/** Money in (with the arrived checkmarks), adjustments, this month's totals, and backups. */
export default function MoreScreen({ data, update, toast }: ScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const month = today().slice(0, 7)
  const sum = monthSummary(data, month)
  const monthName = new Date(month + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const moneyIn = [...data.moneyIn].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30)
  const adjustments = [...data.adjustments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30)

  return (
    <>
      <header className="top"><h1>More</h1></header>

      <section className="card">
        <h2>{monthName}</h2>
        <table className="lines">
          <tbody>
            {POTS.map((p) => <tr key={p}><td>{POT_NAMES[p]} came in</td><td><Money cents={sum.cameIn[p]} /></td></tr>)}
            {CATEGORIES.map((c) => <tr key={c}><td>{CATEGORY_ICON[c]} {CATEGORY_NAMES[c]} spent</td><td><Money cents={-sum.spent[c]} /></td></tr>)}
            {POTS.filter((p) => sum.adjusted[p] !== 0).map((p) => (
              <tr key={p}><td>✎ {POT_NAMES[p]} adjusted</td><td><Money cents={sum.adjusted[p]} /></td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Money in</h2>
        <p className="muted small">✓ means it's in your bank account. Tap the box to change it, or tap the row to change the amount.</p>
        {moneyIn.length === 0 && <p className="muted">Nothing yet.</p>}
        {moneyIn.map((m) => editingId === m.id ? (
          <MoneyInEdit key={m.id} data={data} row={m} onDone={(next, msg) => {
            if (next) update(next)
            setEditingId(null)
            if (msg) toast(msg)
          }} />
        ) : (
          <div key={m.id} className="row">
            <button className={`check ${m.arrived ? 'done' : ''}`} aria-label={m.arrived ? 'Arrived' : 'Not arrived yet'}
              onClick={() => update(setArrived(data, m.id, !m.arrived))}>{m.arrived ? '✓' : ''}</button>
            <button className="grow plain" onClick={() => setEditingId(m.id)}>
              <div>{POT_NAMES[m.pot]} · {m.kind === 'payday' ? 'Payday' : 'Extra'}</div>
              <div className="muted small">{shortDate(m.date)}{m.note ? ` · ${m.note}` : ''}</div>
            </button>
            <Money cents={m.cents} />
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Adjustments</h2>
        <p className="muted small">Corrections made with "Adjust total" on Home. They aren't counted as spending.</p>
        {adjustments.length === 0 && <p className="muted">None.</p>}
        {adjustments.map((a) => (
          <div key={a.id} className="row">
            <div className="grow">
              <div>✎ {POT_NAMES[a.pot]}</div>
              <div className="muted small">{shortDate(a.date)}{a.note ? ` · ${a.note}` : ''}</div>
            </div>
            <Money cents={a.cents} />
            <button className="x" aria-label="Delete" onClick={() => {
              if (!confirm(`Delete this ${formatCents(a.cents)} adjustment (${POT_NAMES[a.pot]}, ${shortDate(a.date)})?`)) return
              update({ ...data, adjustments: data.adjustments.filter((x) => x.id !== a.id) })
              toast('Adjustment deleted')
            }}>×</button>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Back up</h2>
        <p className="muted small">
          Your spending is saved only on this phone. Make a backup every week or two: tap Back up,
          then "Save to Files" and pick iCloud Drive.
        </p>
        <div className="actions">
          <button className="btn primary" onClick={async () => {
            const r = await backup(data)
            if (r !== 'cancelled') toast('Backup made')
          }}>Back up</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Restore from a backup</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            const restored = await readBackup(file)
            const what = `${restored.purchases.length} purchases and ${restored.moneyIn.length} money-in entries`
            if (!confirm(`Replace everything on this phone with the backup (${what})?`)) return
            update(restored)
            toast('Backup restored')
          } catch {
            toast("That file isn't a spending backup")
          }
        }} />
      </section>
      <p className="muted small center">No bank logins or account numbers are stored here.</p>
    </>
  )
}

/** Change a money-in entry: amount, pot, date, note. Or delete it. */
function MoneyInEdit({ data, row, onDone }: { data: AppData; row: MoneyIn; onDone: (next: AppData | null, msg?: string) => void }) {
  const [cents, setCents] = useState<number | null>(row.cents)
  const [pot, setPot] = useState<Pot>(row.pot)
  const [date, setDate] = useState(row.date)
  const [note, setNote] = useState(row.note ?? '')
  const replace = (next: MoneyIn | null) => ({
    ...data,
    moneyIn: next ? data.moneyIn.map((m) => (m.id === row.id ? next : m)) : data.moneyIn.filter((m) => m.id !== row.id)
  })
  return (
    <div className="form adjust">
      <MoneyInput label={`Amount (${row.kind === 'payday' ? 'payday' : 'extra'})`} cents={cents} onChange={setCents} autoFocus />
      <div className="chips">
        {POTS.map((p) => (
          <button key={p} className={`chip ${pot === p ? 'on' : ''}`} onClick={() => setPot(p)}>{POT_NAMES[p]}</button>
        ))}
      </div>
      <label className="field">
        <span className="field-label">Date</span>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="actions">
        <button className="btn primary" disabled={!cents} onClick={() => {
          const { note: _old, ...rest } = row
          onDone(replace({ ...rest, cents: cents!, pot, date, ...(note.trim() ? { note: note.trim() } : {}) }), 'Changed')
        }}>Save</button>
        <button className="btn danger" onClick={() => {
          if (!confirm(`Delete ${formatCents(row.cents)} (${POT_NAMES[row.pot]}, ${shortDate(row.date)})?`)) return
          onDone(replace(null), 'Deleted')
        }}>Delete</button>
        <button className="btn" onClick={() => onDone(null)}>Cancel</button>
      </div>
    </div>
  )
}
