export function halfUpDiv(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator))
}

export function lineAmountMinor(qtyHundredths: number, rateMinor: number): number {
  return halfUpDiv(qtyHundredths * rateMinor, 100)
}

export interface MoneyTotals {
  lines: number[]
  subtotalMinor: number
  discountMinor: number
  taxableMinor: number
  taxMinor: number
  totalMinor: number
}

export function computeTotals(
  items: Array<{ qtyHundredths: number; rateMinor: number }>,
  discountPercent: number,
  taxPercent: number,
): MoneyTotals {
  const lines = items.map((item) => lineAmountMinor(item.qtyHundredths, item.rateMinor))
  const subtotalMinor = lines.reduce((sum, line) => sum + line, 0)
  const discountMinor = halfUpDiv(subtotalMinor * discountPercent, 10000)
  const taxableMinor = subtotalMinor - discountMinor
  const taxMinor = halfUpDiv(taxableMinor * taxPercent, 10000)
  const totalMinor = taxableMinor + taxMinor
  return { lines, subtotalMinor, discountMinor, taxableMinor, taxMinor, totalMinor }
}

export function formatUsd(minor: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(minor / 100)
}

function groupThousands(whole: number): string {
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatFraction(frac: number): string {
  return String(frac).padStart(2, '0').replace(/0+$/, '')
}

export function formatRateInput(minor: number): string {
  const whole = Math.floor(minor / 100)
  const frac = minor % 100
  return `${groupThousands(whole)}.${String(frac).padStart(2, '0')}`
}

export function formatPercent(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100)
  const frac = basisPoints % 100
  return frac === 0 ? String(whole) : `${whole}.${formatFraction(frac)}`
}

export function formatQty(hundredths: number): string {
  const whole = Math.floor(hundredths / 100)
  const frac = hundredths % 100
  return frac === 0 ? String(whole) : `${whole}.${formatFraction(frac)}`
}

function parseTwoDecimals(value: string): number | null {
  const cleaned = value.trim().replace(/,/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, fraction = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function parseMoneyInput(value: string): number | null {
  return parseTwoDecimals(value)
}

export function parseQtyInput(value: string): number | null {
  const parsed = parseTwoDecimals(value)
  if (parsed === null || parsed <= 0) return null
  return parsed
}

export function parsePercentInput(value: string): number | null {
  const parsed = parseTwoDecimals(value)
  if (parsed === null || parsed > 10000) return null
  return parsed
}
