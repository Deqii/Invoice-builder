import { beforeEach, describe, expect, it } from 'vitest'
import { invoiceTotalMinor } from '../../src/lib/invoice'
import { displayStatus } from '../../src/lib/status'
import { getInvoice, readProfile, scanInvoices, STORAGE_KEYS } from '../../src/lib/storage'
import { seedInvoices, seedStorage, sellerProfile } from './seed'

beforeEach(() => {
  localStorage.clear()
})

function loadSeed() {
  for (const [key, value] of Object.entries(seedStorage())) {
    localStorage.setItem(key, value)
  }
}

describe('seed fixture', () => {
  it('round-trips through the real storage functions', () => {
    loadSeed()

    const { invoices, corruptKeys } = scanInvoices()
    expect(corruptKeys).toEqual([])
    expect(invoices).toHaveLength(5)
    for (const invoice of seedInvoices) {
      expect(getInvoice(invoice.id)).toEqual(invoice)
    }

    expect(readProfile()).toEqual(sellerProfile)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.counters) ?? 'null')).toEqual({
      '2026': 15,
    })
  })

  it('matches the section 23 totals', () => {
    const totals = Object.fromEntries(
      seedInvoices.map((invoice) => [invoice.number, invoiceTotalMinor(invoice)]),
    )

    expect(totals).toEqual({
      'INV-2026-011': 198000,
      'INV-2026-012': 92550,
      'INV-2026-013': 135000,
      'INV-2026-014': 267300,
      'INV-2026-015': 48000,
    })
  })

  it('has the section 23 display status on 2026-10-26', () => {
    const statuses = Object.fromEntries(
      seedInvoices.map((invoice) => [invoice.number, displayStatus(invoice, '2026-10-26')]),
    )

    expect(statuses).toEqual({
      'INV-2026-011': 'paid',
      'INV-2026-012': 'overdue',
      'INV-2026-013': 'paid',
      'INV-2026-014': 'sent',
      'INV-2026-015': 'draft',
    })
  })
})
