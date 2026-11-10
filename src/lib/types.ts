export type StoredStatus = 'draft' | 'sent' | 'paid'

export interface SellerProfile {
  businessName: string
  email: string
  address: string
}

export interface InvoiceItem {
  id: string
  description: string
  qtyHundredths: number
  rateMinor: number
}

export interface Invoice {
  id: string
  number: string | null
  status: StoredStatus
  issuedDate: string
  dueDate: string
  billedTo: string
  paymentMethod: string
  items: InvoiceItem[]
  discountPercent: number
  taxPercent: number
  notes: string
  createdAt: string
  updatedAt: string
}

export type NewInvoice = Omit<Invoice, 'number' | 'createdAt' | 'updatedAt'> & {
  number?: null
}
