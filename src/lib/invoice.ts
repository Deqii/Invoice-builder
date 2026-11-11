import type { Invoice, NewInvoice } from './types'
import { addDaysISO, netDays } from './dates'
import { newId } from './id'
import { computeTotals } from './money'

export function clientName(billedTo: string): string {
  const line = billedTo
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.length > 0)
  return line ?? ''
}

export function invoiceTotalMinor(invoice: Invoice): number {
  return computeTotals(invoice.items, invoice.discountPercent, invoice.taxPercent).totalMinor
}

export function buildDuplicate(source: Invoice, today: string): NewInvoice {
  return {
    id: newId(),
    number: null,
    status: 'draft',
    issuedDate: today,
    dueDate: addDaysISO(today, netDays(source.issuedDate, source.dueDate)),
    billedTo: source.billedTo,
    paymentMethod: source.paymentMethod,
    items: source.items.map((item) => ({ ...item, id: newId() })),
    discountPercent: source.discountPercent,
    taxPercent: source.taxPercent,
    notes: source.notes,
  }
}
