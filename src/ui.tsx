// Small shared pieces used by several screens.
import { useState } from 'react'
import { formatCents, parseDollars } from './logic/money'
import { CATEGORIES, CATEGORY_NAMES, type Category } from './logic/data'

export const Money = ({ cents, className = '' }: { cents: number; className?: string }) => (
  <span className={`money ${cents < 0 ? 'neg' : ''} ${className}`}>{formatCents(cents)}</span>
)

export const CATEGORY_ICON: Record<Category, string> = { groceries: '🛒', gas: '⛽', personal: '💗', other: '🏷️' }

/** A money text box: she types 42.17, we hand back cents (or null while it isn't a valid amount). */
export function MoneyInput(props: { label: string; cents: number | null; onChange: (c: number | null) => void; autoFocus?: boolean }) {
  const [text, setText] = useState(props.cents != null && props.cents > 0 ? (props.cents / 100).toFixed(2) : '')
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <div className="money-input">
        <span>$</span>
        <input
          inputMode="decimal"
          placeholder="0.00"
          value={text}
          autoFocus={props.autoFocus}
          onChange={(e) => {
            setText(e.target.value)
            props.onChange(e.target.value.trim() === '' ? null : parseDollars(e.target.value))
          }}
        />
      </div>
    </label>
  )
}

/** Category buttons. `all` adds an "All" choice (for filters). */
export function CategoryPicker(props: { value: Category | null; onChange: (c: Category | null) => void; all?: boolean }) {
  return (
    <div className="chips">
      {props.all && (
        <button className={`chip ${props.value === null ? 'on' : ''}`} onClick={() => props.onChange(null)}>All</button>
      )}
      {CATEGORIES.map((c) => (
        <button key={c} className={`chip ${props.value === c ? 'on' : ''}`} onClick={() => props.onChange(c)}>
          {CATEGORY_ICON[c]} {CATEGORY_NAMES[c]}
        </button>
      ))}
    </div>
  )
}
