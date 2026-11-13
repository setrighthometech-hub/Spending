import { useState } from 'react'
import type { ScreenProps } from '../App'
import { knownStores } from '../logic/budget'
import { newId, type Category, type Purchase } from '../logic/data'
import { today } from '../logic/dates'
import { formatCents } from '../logic/money'
import { CategoryPicker, MoneyInput } from '../ui'

/** Add a purchase, or change/delete one (when `editing` is given). */
export default function PurchaseScreen({ data, update, go, toast, editing }: ScreenProps & { editing: Purchase | null }) {
  const [cents, setCents] = useState<number | null>(editing?.cents ?? null)
  const [category, setCategory] = useState<Category | null>(editing?.category ?? null)
  const [store, setStore] = useState(editing?.store ?? '')
  const [date, setDate] = useState(editing?.date ?? today())
  const [note, setNote] = useState(editing?.note ?? '')

  const typed = store.trim().toLowerCase()
  const stores = knownStores(data.purchases, category ?? undefined)
    .filter((s) => !typed || (s.toLowerCase().includes(typed) && s.toLowerCase() !== typed))
    .slice(0, 8)
  const ok = !!cents && !!category

  const saveIt = () => {
    const p: Purchase = {
      id: editing?.id ?? newId(), date, category: category!, cents: cents!, store: store.trim(),
      ...(note.trim() ? { note: note.trim() } : {})
    }
    const purchases = editing ? data.purchases.map((x) => (x.id === p.id ? p : x)) : [...data.purchases, p]
    update({ ...data, purchases })
    toast(`${editing ? 'Changed' : 'Saved'}: ${formatCents(p.cents)}${p.store ? ' at ' + p.store : ''}`)
    go('home')
  }

  return (
    <>
      <header className="top"><h1>{editing ? 'Change purchase' : 'Add a purchase'}</h1></header>
      <section className="card form">
        <MoneyInput label="Total" cents={cents} onChange={setCents} autoFocus={!editing} />
        <span className="field-label">What for</span>
        <CategoryPicker value={category} onChange={setCategory} />
        <label className="field">
          <span className="field-label">Store</span>
          <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="e.g. Aldi" autoCapitalize="words" />
        </label>
        {stores.length > 0 && (
          <div className="chips">
            {stores.map((s) => <button key={s} className="chip" onClick={() => setStore(s)}>{s}</button>)}
          </div>
        )}
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={!ok} onClick={saveIt}>{editing ? 'Save changes' : 'Save purchase'}</button>
          {editing && (
            <button className="btn danger" onClick={() => {
              if (!confirm(`Delete ${formatCents(editing.cents)}${editing.store ? ' at ' + editing.store : ''}?`)) return
              update({ ...data, purchases: data.purchases.filter((x) => x.id !== editing.id) })
              toast('Deleted')
              go('days')
            }}>Delete</button>
          )}
          <button className="btn" onClick={() => go(editing ? 'days' : 'home')}>Cancel</button>
        </div>
        {!ok && <p className="muted small">Type the total and pick what it was for.</p>}
      </section>
    </>
  )
}
