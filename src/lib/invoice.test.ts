import { describe, expect, it } from 'vitest'
import type { Invoice } from './types'
import { buildDuplicate, clientName, invoiceTotalMinor } from './invoice'

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'source-id',
    number: 'INV-2026-014',
    status: 'sent',
    issuedDate: '2026-10-20',
    dueDate: '2026-11-03',
    billedTo: 'Northwind Labs\nAttn: Jamie Lee',
    paymentMethod: 'Bank transfer',
    items: [
      { id: 'item-a', description: 'Landing page design', qtyHundredths: 100, rateMinor: 120000 },
      { id: 'item-b', description: 'Front-end implementation', qtyHundredths: 2400, rateMinor: 4500 },
      { id: 'item-c', description: 'Responsive QA and handoff', qtyHundredths: 600, rateMinor: 4500 },
      { id: 'item-d', description: 'Hosting setup', qtyHundredths: 100, rateMinor: 15000 },
    ],
    discountPercent: 1000,
    taxPercent: 1000,
    notes: 'Thank you.',
    createdAt: '2026-10-20T08:00:00.000Z',
    updatedAt: '2026-10-20T08:00:00.000Z',
    ...overrides,
  }
}

describe('clientName', () => {
  it('returns the first non-empty line trimmed', () => {
    expect(clientName('  \n  Northwind Labs\nAttn: Jamie Lee  ')).toBe('Northwind Labs')
  })

  it('returns an empty string for blank input', () => {
    expect(clientName('')).toBe('')
    expect(clientName('   \n\t  ')).toBe('')
  })
})

describe('invoiceTotalMinor', () => {
  it('returns the worked-example total of the seeded INV-2026-014 shape', () => {
    expect(invoiceTotalMinor(makeInvoice())).toBe(267300)
  })
})

describe('buildDuplicate', () => {
  it('builds a new draft dated today with due date today plus the source net days', () => {
    const source = makeInvoice()
    const duplicate = buildDuplicate(source, '2026-10-26')

    expect(duplicate.status).toBe('draft')
    expect(duplicate.number).toBeNull()
    expect(duplicate.issuedDate).toBe('2026-10-26')
    expect(duplicate.dueDate).toBe('2026-11-09')
    expect(duplicate.id).not.toBe(source.id)
    expect('createdAt' in duplicate).toBe(false)
    expect('updatedAt' in duplicate).toBe(false)
  })

  it('copies the documented fields and every item field', () => {
    const source = makeInvoice()
    const duplicate = buildDuplicate(source, '2026-10-26')

    expect(duplicate.billedTo).toBe(source.billedTo)
    expect(duplicate.paymentMethod).toBe(source.paymentMethod)
    expect(duplicate.discountPercent).toBe(source.discountPercent)
    expect(duplicate.taxPercent).toBe(source.taxPercent)
    expect(duplicate.notes).toBe(source.notes)
    expect(duplicate.items).toHaveLength(source.items.length)
    duplicate.items.forEach((item, index) => {
      expect(item.description).toBe(source.items[index].description)
      expect(item.qtyHundredths).toBe(source.items[index].qtyHundredths)
      expect(item.rateMinor).toBe(source.items[index].rateMinor)
    })
  })

  it('gives every item a new unique id that differs from every source item id', () => {
    const source = makeInvoice()
    const duplicate = buildDuplicate(source, '2026-10-26')

    const sourceItemIds = new Set(source.items.map((item) => item.id))
    const duplicateItemIds = duplicate.items.map((item) => item.id)
    expect(new Set(duplicateItemIds).size).toBe(duplicateItemIds.length)
    for (const id of duplicateItemIds) {
      expect(sourceItemIds.has(id)).toBe(false)
    }
  })

  it('does not mutate the source invoice', () => {
    const source = makeInvoice()
    const snapshot = JSON.parse(JSON.stringify(source))

    buildDuplicate(source, '2026-10-26')

    expect(source).toEqual(snapshot)
  })
})
