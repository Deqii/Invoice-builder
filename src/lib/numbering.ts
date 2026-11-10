import type { Invoice } from './types'

const NUMBER_PATTERN = /^INV-(\d{4})-(\d+)$/

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(3, '0')}`
}

export function parseInvoiceNumber(value: string): { year: number; sequence: number } | null {
  const match = NUMBER_PATTERN.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const sequence = Number(match[2])
  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(sequence)) return null
  return { year, sequence }
}

export function nextSequence(existingNumbers: string[], year: number, counter: number): number {
  let highest = 0
  for (const value of existingNumbers) {
    const parsed = parseInvoiceNumber(value)
    if (parsed && parsed.year === year && parsed.sequence > highest) highest = parsed.sequence
  }
  return Math.max(counter, highest) + 1
}

export function compareInvoiceNumbers(a: string | null, b: string | null): number {
  const parsedA = a === null ? null : parseInvoiceNumber(a)
  const parsedB = b === null ? null : parseInvoiceNumber(b)
  if (parsedA && parsedB) {
    if (parsedA.year !== parsedB.year) return parsedA.year - parsedB.year
    return parsedA.sequence - parsedB.sequence
  }
  if (parsedA) return 1
  if (parsedB) return -1
  return 0
}

export function sortInvoicesNewestFirst(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => {
    const order = compareInvoiceNumbers(a.number, b.number)
    if (order !== 0) return -order
    return b.createdAt.localeCompare(a.createdAt)
  })
}
