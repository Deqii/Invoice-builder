import type { Invoice, SellerProfile } from '../../src/lib/types'
import { STORAGE_KEYS } from '../../src/lib/storage'

export const sellerProfile: SellerProfile = {
  businessName: 'Rama Studio',
  email: 'hello@ramastudio.example',
  address: 'Bandung, Indonesia',
}

export const seedInvoices: Invoice[] = [
  {
    id: 'inv-011',
    number: 'INV-2026-011',
    status: 'paid',
    issuedDate: '2026-09-02',
    dueDate: '2026-09-16',
    billedTo: 'Northwind Labs',
    paymentMethod: 'Bank transfer',
    items: [
      { id: 'item-011-1', description: 'Services', qtyHundredths: 100, rateMinor: 198000 },
    ],
    discountPercent: 0,
    taxPercent: 0,
    notes: '',
    createdAt: '2026-09-02T08:00:00.000Z',
    updatedAt: '2026-09-16T08:00:00.000Z',
  },
  {
    id: 'inv-012',
    number: 'INV-2026-012',
    status: 'sent',
    issuedDate: '2026-09-15',
    dueDate: '2026-09-29',
    billedTo: 'Birch & Co',
    paymentMethod: 'Bank transfer',
    items: [
      { id: 'item-012-1', description: 'Services', qtyHundredths: 100, rateMinor: 92550 },
    ],
    discountPercent: 0,
    taxPercent: 0,
    notes: '',
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
  },
  {
    id: 'inv-013',
    number: 'INV-2026-013',
    status: 'paid',
    issuedDate: '2026-10-01',
    dueDate: '2026-10-15',
    billedTo: 'Atlas Ventures',
    paymentMethod: 'Bank transfer',
    items: [
      { id: 'item-013-1', description: 'Services', qtyHundredths: 100, rateMinor: 135000 },
    ],
    discountPercent: 0,
    taxPercent: 0,
    notes: '',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
  },
  {
    id: 'inv-014',
    number: 'INV-2026-014',
    status: 'sent',
    issuedDate: '2026-10-20',
    dueDate: '2026-11-03',
    billedTo:
      'Northwind Labs\nAttn: Jamie Lee\n221 Market Street, Suite 4\nAustin, TX 78701, USA\nbilling@northwind.example',
    paymentMethod: 'Bank transfer',
    items: [
      {
        id: 'item-014-1',
        description: 'Landing page design',
        qtyHundredths: 100,
        rateMinor: 120000,
      },
      {
        id: 'item-014-2',
        description: 'Front-end implementation (React)',
        qtyHundredths: 2400,
        rateMinor: 4500,
      },
      {
        id: 'item-014-3',
        description: 'Responsive QA and handoff',
        qtyHundredths: 600,
        rateMinor: 4500,
      },
      { id: 'item-014-4', description: 'Hosting setup', qtyHundredths: 100, rateMinor: 15000 },
    ],
    discountPercent: 1000,
    taxPercent: 1000,
    notes:
      'Thank you for your business. Payment is due within 14 days of the issue date. Late payments may incur a 1.5% monthly fee.',
    createdAt: '2026-10-20T08:00:00.000Z',
    updatedAt: '2026-10-20T08:00:00.000Z',
  },
  {
    id: 'inv-015',
    number: 'INV-2026-015',
    status: 'draft',
    issuedDate: '2026-10-26',
    dueDate: '2026-11-09',
    billedTo: 'Meridian Cafe',
    paymentMethod: 'Bank transfer',
    items: [
      { id: 'item-015-1', description: 'Services', qtyHundredths: 100, rateMinor: 48000 },
    ],
    discountPercent: 0,
    taxPercent: 0,
    notes: '',
    createdAt: '2026-10-26T08:00:00.000Z',
    updatedAt: '2026-10-26T08:00:00.000Z',
  },
]

export function seedStorage(): Record<string, string> {
  const entries: Record<string, string> = {
    [STORAGE_KEYS.profile]: JSON.stringify(sellerProfile),
    [STORAGE_KEYS.counters]: JSON.stringify({ '2026': 15 }),
  }
  for (const invoice of seedInvoices) {
    entries[STORAGE_KEYS.invoicePrefix + invoice.id] = JSON.stringify(invoice)
  }
  return entries
}
