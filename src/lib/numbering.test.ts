import { describe, expect, it } from 'vitest'
import {
  compareInvoiceNumbers,
  formatInvoiceNumber,
  nextSequence,
  parseInvoiceNumber,
  sortInvoicesNewestFirst,
} from './numbering'
import type { Invoice } from './types'

const invoice = (number: string | null, createdAt: string) =>
  ({ number, createdAt }) as Invoice

describe('invoice numbering', () => {
  it('formats at least three digits and grows naturally', () => {
    expect(formatInvoiceNumber(2026, 1)).toBe('INV-2026-001')
    expect(formatInvoiceNumber(2026, 999)).toBe('INV-2026-999')
    expect(formatInvoiceNumber(2026, 1000)).toBe('INV-2026-1000')
  })

  it('parses year and sequence as integers', () => {
    expect(parseInvoiceNumber('INV-2026-014')).toEqual({ year: 2026, sequence: 14 })
    expect(parseInvoiceNumber('INV-2026-1000')).toEqual({ year: 2026, sequence: 1000 })
    expect(parseInvoiceNumber('INV-2026-001')).toEqual({ year: 2026, sequence: 1 })
    expect(parseInvoiceNumber('nope')).toBeNull()
  })

  it('returns null when the sequence is not a safe integer', () => {
    expect(parseInvoiceNumber('INV-2026-99999999999999999999')).toBeNull()
  })

  it('compares numerically, not as strings', () => {
    expect(compareInvoiceNumbers('INV-2026-1000', 'INV-2026-999')).toBeGreaterThan(0)
    expect(compareInvoiceNumbers('INV-2026-014', 'INV-2026-015')).toBeLessThan(0)
    expect(compareInvoiceNumbers('INV-2027-001', 'INV-2026-999')).toBeGreaterThan(0)
  })

  it('treats null and unparseable numbers as sorting before numbered ones', () => {
    expect(compareInvoiceNumbers(null, 'INV-2026-001')).toBeLessThan(0)
    expect(compareInvoiceNumbers('INV-2026-001', null)).toBeGreaterThan(0)
    expect(compareInvoiceNumbers(null, null)).toBe(0)
    expect(compareInvoiceNumbers('nope', 'INV-2026-001')).toBeLessThan(0)
    expect(compareInvoiceNumbers('INV-2026-001', 'nope')).toBeGreaterThan(0)
    expect(compareInvoiceNumbers('nope', 'also-nope')).toBe(0)
  })

  it('sorts newest first by number, then createdAt', () => {
    const sorted = sortInvoicesNewestFirst([
      invoice('INV-2026-999', '2026-10-01T00:00:00.000Z'),
      invoice('INV-2026-1000', '2026-10-02T00:00:00.000Z'),
      invoice('INV-2026-014', '2026-10-03T00:00:00.000Z'),
    ])
    expect(sorted.map((i) => i.number)).toEqual([
      'INV-2026-1000',
      'INV-2026-999',
      'INV-2026-014',
    ])
  })

  it('places unnumbered invoices after numbered ones, newest createdAt first', () => {
    const sorted = sortInvoicesNewestFirst([
      invoice(null, '2026-10-03T00:00:00.000Z'),
      invoice('INV-2026-002', '2026-10-01T00:00:00.000Z'),
      invoice('INV-2026-001', '2026-10-02T00:00:00.000Z'),
      invoice(null, '2026-10-04T00:00:00.000Z'),
    ])
    expect(sorted.map((i) => i.number)).toEqual([
      'INV-2026-002',
      'INV-2026-001',
      null,
      null,
    ])
    expect(sorted[2].createdAt).toBe('2026-10-04T00:00:00.000Z')
  })

  it('uses the greater of the counter and the highest existing sequence', () => {
    expect(nextSequence([], 2026, 0)).toBe(1)
    expect(nextSequence(['INV-2026-014'], 2026, 2)).toBe(15)
    expect(nextSequence(['INV-2026-009'], 2026, 2)).toBe(10)
    expect(nextSequence(['INV-2026-014'], 2026, 20)).toBe(21)
    expect(nextSequence(['INV-2026-1000'], 2026, 999)).toBe(1001)
    expect(nextSequence(['INV-2025-050'], 2026, 0)).toBe(1)
  })
})
