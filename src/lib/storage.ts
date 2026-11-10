import { formatInvoiceNumber, nextSequence, parseInvoiceNumber } from './numbering'
import type { Invoice, NewInvoice, SellerProfile, StoredStatus } from './types'

export const STORAGE_KEYS = {
  profile: 'invoice-builder:v1:seller-profile',
  invoicePrefix: 'invoice-builder:v1:invoice:',
  counters: 'invoice-builder:v1:counters',
} as const

export const INVOICE_LOCK = 'invoice-builder:invoice-write'

export type StorageFailureCode =
  | 'unavailable'
  | 'no-locks'
  | 'parse'
  | 'write'
  | 'invalid'
  | 'collision'

export class StorageFailure extends Error {
  code: StorageFailureCode

  constructor(code: StorageFailureCode, message: string) {
    super(message)
    this.name = 'StorageFailure'
    this.code = code
  }
}

export interface StoreScan {
  invoices: Invoice[]
  corruptKeys: string[]
}

const NO_LOCKS_MESSAGE =
  'Saving is not available in this browser. Please use a current version of Chrome, Edge, Firefox or Safari.'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const STORED_STATUSES: StoredStatus[] = ['draft', 'sent', 'paid']

function isValidDate(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function isStoredInvoice(value: unknown): value is Invoice {
  if (typeof value !== 'object' || value === null) return false
  const invoice = value as Record<string, unknown>
  if (typeof invoice.id !== 'string' || invoice.id === '') return false
  if (invoice.number !== null) {
    if (typeof invoice.number !== 'string' || parseInvoiceNumber(invoice.number) === null) {
      return false
    }
  }
  if (typeof invoice.status !== 'string' || !STORED_STATUSES.includes(invoice.status as StoredStatus)) {
    return false
  }
  if (!isValidDate(invoice.issuedDate) || !isValidDate(invoice.dueDate)) return false
  if (typeof invoice.billedTo !== 'string') return false
  if (typeof invoice.paymentMethod !== 'string') return false
  if (typeof invoice.notes !== 'string') return false
  if (typeof invoice.createdAt !== 'string' || typeof invoice.updatedAt !== 'string') return false
  if (!Number.isSafeInteger(invoice.discountPercent) || !Number.isSafeInteger(invoice.taxPercent)) {
    return false
  }
  const discount = invoice.discountPercent as number
  const tax = invoice.taxPercent as number
  if (discount < 0 || discount > 10000 || tax < 0 || tax > 10000) return false
  if (!Array.isArray(invoice.items) || invoice.items.length === 0) return false
  return invoice.items.every((item: unknown) => {
    if (typeof item !== 'object' || item === null) return false
    const entry = item as Record<string, unknown>
    return (
      typeof entry.id === 'string' &&
      entry.id !== '' &&
      typeof entry.description === 'string' &&
      Number.isSafeInteger(entry.qtyHundredths) &&
      (entry.qtyHundredths as number) > 0 &&
      Number.isSafeInteger(entry.rateMinor) &&
      (entry.rateMinor as number) >= 0
    )
  })
}

function isProfile(value: unknown): value is SellerProfile {
  if (typeof value !== 'object' || value === null) return false
  const profile = value as Record<string, unknown>
  return (
    typeof profile.businessName === 'string' &&
    profile.businessName.trim() !== '' &&
    typeof profile.email === 'string' &&
    typeof profile.address === 'string'
  )
}

async function withInvoiceLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const locks = navigator.locks
  if (!locks) throw new StorageFailure('no-locks', NO_LOCKS_MESSAGE)
  return locks.request(INVOICE_LOCK, { mode: 'exclusive' }, fn)
}

function parseStoredInvoice(raw: string): Invoice {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new StorageFailure('parse', 'A stored invoice is corrupt.')
  }
  if (!isStoredInvoice(parsed)) throw new StorageFailure('parse', 'A stored invoice is corrupt.')
  return parsed
}

function readCounters(): Record<string, number> {
  const raw = localStorage.getItem(STORAGE_KEYS.counters)
  if (raw === null) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new StorageFailure('parse', 'The stored counters are corrupt.')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new StorageFailure('parse', 'The stored counters are corrupt.')
  }
  const counters: Record<string, number> = {}
  for (const [year, value] of Object.entries(parsed)) {
    if (!Number.isSafeInteger(value) || (value as number) < 0) {
      throw new StorageFailure('parse', 'The stored counters are corrupt.')
    }
    counters[year] = value as number
  }
  return counters
}

export function isStorageAvailable(): boolean {
  const probeKey = `${STORAGE_KEYS.counters}:probe`
  try {
    localStorage.setItem(probeKey, '1')
    localStorage.removeItem(probeKey)
    return true
  } catch {
    return false
  }
}

export function scanInvoices(): StoreScan {
  const invoices: Invoice[] = []
  const corruptKeys: string[] = []
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
  for (const key of keys) {
    if (key === null || !key.startsWith(STORAGE_KEYS.invoicePrefix)) continue
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isStoredInvoice(parsed)) invoices.push(parsed)
      else corruptKeys.push(key)
    } catch {
      corruptKeys.push(key)
    }
  }
  return { invoices, corruptKeys }
}

export function getInvoice(id: string): Invoice | null {
  const raw = localStorage.getItem(STORAGE_KEYS.invoicePrefix + id)
  if (raw === null) return null
  return parseStoredInvoice(raw)
}

export function readProfile(): SellerProfile | null {
  const raw = localStorage.getItem(STORAGE_KEYS.profile)
  if (raw === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new StorageFailure('parse', 'The stored seller profile is corrupt.')
  }
  if (!isProfile(parsed)) throw new StorageFailure('parse', 'The stored seller profile is corrupt.')
  return parsed
}

export function writeProfile(profile: SellerProfile): void {
  if (!isProfile(profile)) throw new StorageFailure('invalid', 'The seller profile is invalid.')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
}

export async function createInvoice(draft: NewInvoice): Promise<Invoice> {
  return withInvoiceLock(() => {
    const { invoices, corruptKeys } = scanInvoices()
    if (corruptKeys.length > 0) throw new StorageFailure('parse', 'A stored invoice is corrupt.')
    const counters = readCounters()
    const key = STORAGE_KEYS.invoicePrefix + draft.id
    if (localStorage.getItem(key) !== null) {
      throw new StorageFailure('collision', 'An invoice with this id already exists.')
    }

    const year = Number(draft.issuedDate.slice(0, 4))
    const existingNumbers = invoices.flatMap((invoice) => (invoice.number ? [invoice.number] : []))
    const sequence = nextSequence(existingNumbers, year, counters[year] ?? 0)
    const now = new Date().toISOString()
    const invoice: Invoice = {
      ...draft,
      number: formatInvoiceNumber(year, sequence),
      createdAt: now,
      updatedAt: now,
    }
    if (!isStoredInvoice(invoice)) throw new StorageFailure('invalid', 'The invoice is invalid.')

    try {
      localStorage.setItem(key, JSON.stringify(invoice))
    } catch {
      throw new StorageFailure('write', 'Could not save the invoice.')
    }
    try {
      localStorage.setItem(
        STORAGE_KEYS.counters,
        JSON.stringify({ ...counters, [year]: sequence }),
      )
    } catch {
      // shortcut: a failed counter write is recovered from the highest existing number on the next assignment
    }
    return invoice
  })
}

export async function updateInvoice(invoice: Invoice): Promise<Invoice> {
  return withInvoiceLock(() => {
    const key = STORAGE_KEYS.invoicePrefix + invoice.id
    const raw = localStorage.getItem(key)
    if (raw === null) throw new StorageFailure('invalid', 'The invoice does not exist.')
    const stored = parseStoredInvoice(raw)
    if (invoice.number !== stored.number) {
      throw new StorageFailure('invalid', 'The invoice number cannot change.')
    }
    const updated: Invoice = {
      ...invoice,
      id: stored.id,
      number: stored.number,
      createdAt: stored.createdAt,
      updatedAt: new Date().toISOString(),
    }
    if (!isStoredInvoice(updated)) throw new StorageFailure('invalid', 'The invoice is invalid.')

    try {
      localStorage.setItem(key, JSON.stringify(updated))
    } catch {
      throw new StorageFailure('write', 'Could not save the invoice.')
    }
    return updated
  })
}

export async function setInvoiceStatus(id: string, status: StoredStatus): Promise<Invoice> {
  return withInvoiceLock(() => {
    const key = STORAGE_KEYS.invoicePrefix + id
    const raw = localStorage.getItem(key)
    if (raw === null) throw new StorageFailure('invalid', 'The invoice does not exist.')
    const stored = parseStoredInvoice(raw)
    const updated: Invoice = {
      ...stored,
      status,
      updatedAt: new Date().toISOString(),
    }
    if (!isStoredInvoice(updated)) throw new StorageFailure('invalid', 'The invoice is invalid.')

    try {
      localStorage.setItem(key, JSON.stringify(updated))
    } catch {
      throw new StorageFailure('write', 'Could not save the invoice.')
    }
    return updated
  })
}

export async function deleteInvoice(id: string): Promise<void> {
  return withInvoiceLock(() => {
    localStorage.removeItem(STORAGE_KEYS.invoicePrefix + id)
  })
}
