// Money is always whole cents (integers), so math never gets rounding errors.
// $42.17 is stored as 4217. Turn it into dollars only for display.

/** "42.17", "$42", "1,234.5" -> cents. Returns null if it isn't a money amount. */
export function parseDollars(text: string): number | null {
  const clean = text.trim().replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(clean)) return null
  const [whole, frac = ''] = clean.split('.')
  return Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2))
}

/** 4217 -> "$42.17", -500 -> "-$5.00" */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(Math.round(cents))
  const dollars = Math.floor(abs / 100).toLocaleString('en-US')
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, '0')}`
}
