import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  STORAGE_KEYS,
  StorageFailure,
  createInvoice,
  deleteInvoice,
  getInvoice,
  isStorageAvailable,
  readProfile,
  scanInvoices,
  setInvoiceStatus,
  updateInvoice,
  writeProfile,
} from './storage'
import type { Invoice, NewInvoice } from './types'

let draftCounter = 0
const draft = (overrides: Partial<NewInvoice> = {}): NewInvoice => ({
  id: `inv-${++draftCounter}`,
  number: null,
  status: 'draft',
  issuedDate: '2026-10-20',
  dueDate: '2026-11-03',
  billedTo: 'Northwind Labs',
  paymentMethod: 'Bank transfer',
  items: [{ id: 'item-1', description: 'Services', qtyHundredths: 100, rateMinor: 48000 }],
  discountPercent: 0,
  taxPercent: 0,
  notes: '',
  ...overrides,
})

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'seed-1',
  number: 'INV-2026-005',
  status: 'draft',
  issuedDate: '2026-10-20',
  dueDate: '2026-11-03',
  billedTo: 'Northwind Labs',
  paymentMethod: 'Bank transfer',
  items: [{ id: 'item-1', description: 'Services', qtyHundredths: 100, rateMinor: 48000 }],
  discountPercent: 0,
  taxPercent: 0,
  notes: '',
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
  ...overrides,
})

const invoiceKey = (id: string) => STORAGE_KEYS.invoicePrefix + id
const seedInvoice = (invoice: Invoice) =>
  localStorage.setItem(invoiceKey(invoice.id), JSON.stringify(invoice))
const setCounter = (counters: Record<string, number>) =>
  localStorage.setItem(STORAGE_KEYS.counters, JSON.stringify(counters))
const readCounter = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.counters) ?? '{}')

beforeEach(() => {
  draftCounter = 0
  localStorage.clear()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: <T>(_name: string, _options: unknown, callback: () => T | Promise<T>) =>
        Promise.resolve(callback()),
    },
  })
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('createInvoice', () => {
  it('assigns consecutive numbers for the same year', async () => {
    const first = await createInvoice(draft())
    const second = await createInvoice(draft())

    expect(first.number).toBe('INV-2026-001')
    expect(second.number).toBe('INV-2026-002')
  })

  it('keeps sequences separate per year and uses the issued year', async () => {
    const backdated = await createInvoice(draft({ issuedDate: '2025-12-31' }))
    const current = await createInvoice(draft({ issuedDate: '2026-01-02' }))

    expect(backdated.number).toBe('INV-2025-001')
    expect(current.number).toBe('INV-2026-001')
  })

  it('stores each invoice under its own key with timestamps', async () => {
    const invoice = await createInvoice(draft())

    expect(getInvoice(invoice.id)).toEqual(invoice)
    expect(invoice.createdAt).toBe(invoice.updatedAt)
    expect(readCounter()).toEqual({ '2026': 1 })
  })

  it('never overwrites an existing invoice id and writes nothing on collision', async () => {
    const existing = makeInvoice({ id: 'fixed-id', number: 'INV-2026-001' })
    seedInvoice(existing)

    await expect(createInvoice(draft({ id: 'fixed-id' }))).rejects.toMatchObject({
      code: 'collision',
    })
    expect(JSON.parse(localStorage.getItem(invoiceKey('fixed-id')) ?? '{}')).toEqual(existing)
    expect(localStorage.getItem(STORAGE_KEYS.counters)).toBeNull()
  })

  it('recovers from a stale counter using the highest existing number', async () => {
    seedInvoice(makeInvoice({ id: 'seed-5', number: 'INV-2026-005' }))
    setCounter({ '2026': 2 })

    const created = await createInvoice(draft())

    expect(created.number).toBe('INV-2026-006')
  })

  it('advances past the highest existing number and updates the counter', async () => {
    seedInvoice(makeInvoice({ id: 'seed-5', number: 'INV-2026-005' }))
    seedInvoice(makeInvoice({ id: 'seed-9', number: 'INV-2026-009' }))
    setCounter({ '2026': 2 })

    const created = await createInvoice(draft())

    expect(created.number).toBe('INV-2026-010')
    expect(readCounter()).toEqual({ '2026': 10 })
  })

  it('rejects invalid drafts without writing', async () => {
    await expect(
      createInvoice(draft({ issuedDate: '2026-02-30', items: [] })),
    ).rejects.toMatchObject({ code: 'invalid' })
    expect(localStorage.getItem(STORAGE_KEYS.counters)).toBeNull()
  })

  it('reports a corrupt stored invoice and refuses to write over it', async () => {
    localStorage.setItem(invoiceKey('bad'), '{not json')

    const scan = scanInvoices()
    expect(scan.corruptKeys).toEqual([invoiceKey('bad')])
    await expect(createInvoice(draft())).rejects.toMatchObject({ code: 'parse' })
    expect(localStorage.getItem(invoiceKey('bad'))).toBe('{not json')
  })
})

describe('updateInvoice', () => {
  it('keeps the stored id, number and createdAt and bumps updatedAt', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-20T10:00:00.000Z'))
    const created = await createInvoice(draft())
    vi.setSystemTime(new Date('2026-10-21T10:00:00.000Z'))

    const updated = await updateInvoice({
      ...created,
      billedTo: 'New Client',
    })

    expect(updated.id).toBe(created.id)
    expect(updated.number).toBe('INV-2026-001')
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.updatedAt).not.toBe(created.updatedAt)
    expect(updated.billedTo).toBe('New Client')
    expect(getInvoice(created.id)).toEqual(updated)
    expect(readCounter()).toEqual({ '2026': 1 })
  })

  it('rejects a changed number and writes nothing', async () => {
    const created = await createInvoice(draft())

    await expect(
      updateInvoice({ ...created, number: 'INV-2026-999' }),
    ).rejects.toMatchObject({ code: 'invalid' })
    expect(getInvoice(created.id)).toEqual(created)
  })

  it('rejects an invalid object and leaves the stored invoice unchanged', async () => {
    const created = await createInvoice(draft())

    await expect(updateInvoice({ ...created, items: [] })).rejects.toMatchObject({
      code: 'invalid',
    })
    expect(getInvoice(created.id)).toEqual(created)
  })

  it('rejects a missing invoice', async () => {
    await expect(updateInvoice(makeInvoice({ id: 'missing' }))).rejects.toMatchObject({
      code: 'invalid',
    })
  })
})

describe('setInvoiceStatus', () => {
  it('changes the stored status without changing the number', async () => {
    const created = await createInvoice(draft())

    const sent = await setInvoiceStatus(created.id, 'sent')

    expect(sent.status).toBe('sent')
    expect(sent.number).toBe(created.number)
    expect(getInvoice(created.id)?.status).toBe('sent')
    expect(readCounter()).toEqual({ '2026': 1 })
  })

  it('rejects a missing invoice', async () => {
    await expect(setInvoiceStatus('missing', 'sent')).rejects.toMatchObject({
      code: 'invalid',
    })
  })

  it('rejects a corrupt invoice without overwriting it', async () => {
    localStorage.setItem(invoiceKey('bad'), '{not json')

    await expect(setInvoiceStatus('bad', 'sent')).rejects.toMatchObject({ code: 'parse' })
    expect(localStorage.getItem(invoiceKey('bad'))).toBe('{not json')
  })
})

describe('deleteInvoice', () => {
  it('removes the key but never lowers the counter', async () => {
    const first = await createInvoice(draft())
    const second = await createInvoice(draft())

    await deleteInvoice(second.id)

    expect(getInvoice(second.id)).toBeNull()
    expect(getInvoice(first.id)).not.toBeNull()
    const third = await createInvoice(draft())
    expect(third.number).toBe('INV-2026-003')
  })
})

describe('invoice write lock', () => {
  let calls: Array<{ name: string; options: unknown }> = []
  let callbackInvocations = 0
  let request: ReturnType<typeof vi.fn> = vi.fn()

  beforeEach(() => {
    calls = []
    callbackInvocations = 0
    request = vi.fn((name: string, options: unknown, callback: () => unknown) => {
      calls.push({ name, options })
      return Promise.resolve().then(() => {
        callbackInvocations += 1
        return callback()
      })
    })
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } })
  })

  const expectLockRequest = () => {
    expect(request).toHaveBeenCalledTimes(1)
    expect(calls).toEqual([
      { name: 'invoice-builder:invoice-write', options: { mode: 'exclusive' } },
    ])
    expect(callbackInvocations).toBe(1)
  }

  it('uses the invoice-write lock once for createInvoice', async () => {
    await createInvoice(draft())
    expectLockRequest()
  })

  it('uses the invoice-write lock once for updateInvoice', async () => {
    seedInvoice(makeInvoice({ id: 'seed-1' }))
    await updateInvoice(makeInvoice({ id: 'seed-1' }))
    expectLockRequest()
  })

  it('uses the invoice-write lock once for setInvoiceStatus', async () => {
    seedInvoice(makeInvoice({ id: 'seed-1' }))
    await setInvoiceStatus('seed-1', 'sent')
    expectLockRequest()
  })

  it('uses the invoice-write lock once for deleteInvoice', async () => {
    seedInvoice(makeInvoice({ id: 'seed-1' }))
    await deleteInvoice('seed-1')
    expectLockRequest()
  })
})

describe('localStorage write failures', () => {
  it('rejects with write when the invoice key cannot be saved and leaves the counter unchanged', async () => {
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith(STORAGE_KEYS.invoicePrefix)) throw new Error('quota')
      return originalSetItem.call(this, key, value)
    })

    await expect(createInvoice(draft())).rejects.toMatchObject({ code: 'write' })
    expect(localStorage.getItem(STORAGE_KEYS.counters)).toBeNull()
  })

  it('keeps the saved invoice and recovers the number when the counter write fails', async () => {
    const originalSetItem = Storage.prototype.setItem
    let counterWriteFailed = false
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === STORAGE_KEYS.counters && !counterWriteFailed) {
        counterWriteFailed = true
        throw new Error('quota')
      }
      return originalSetItem.call(this, key, value)
    })

    const first = await createInvoice(draft())
    expect(first.number).toBe('INV-2026-001')
    expect(getInvoice(first.id)).not.toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.counters)).toBeNull()

    vi.restoreAllMocks()
    const second = await createInvoice(draft())
    expect(second.number).toBe('INV-2026-002')
  })
})

describe('writes without navigator.locks', () => {
  it('refuses every write with the spec message and writes nothing', async () => {
    const message =
      'Saving is not available in this browser. Please use a current version of Chrome, Edge, Firefox or Safari.'
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })

    await expect(createInvoice(draft())).rejects.toMatchObject({ code: 'no-locks', message })
    await expect(updateInvoice(makeInvoice())).rejects.toMatchObject({ code: 'no-locks', message })
    await expect(setInvoiceStatus('seed-1', 'sent')).rejects.toMatchObject({
      code: 'no-locks',
      message,
    })
    await expect(deleteInvoice('seed-1')).rejects.toMatchObject({ code: 'no-locks', message })
    expect(localStorage.length).toBe(0)
  })
})

describe('isStorageAvailable', () => {
  it('returns false when localStorage throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(isStorageAvailable()).toBe(false)
  })
})

describe('seller profile', () => {
  it('round-trips a valid profile', () => {
    const profile = { businessName: 'Rama Studio', email: 'hi@rama.test', address: 'Jakarta' }

    writeProfile(profile)

    expect(readProfile()).toEqual(profile)
  })

  it('throws parse on a corrupt profile and does not overwrite it', () => {
    localStorage.setItem(STORAGE_KEYS.profile, '{not json')

    expect(() => readProfile()).toThrow(StorageFailure)
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBe('{not json')
  })

  it('rejects an invalid profile without writing', () => {
    expect(() =>
      writeProfile({ businessName: '', email: 'hi@rama.test', address: 'Jakarta' }),
    ).toThrow(StorageFailure)
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull()
  })
})

describe('scanInvoices', () => {
  it('builds the list from the invoice prefix and ignores other keys', async () => {
    await createInvoice(draft())
    await createInvoice(draft({ issuedDate: '2025-01-01' }))
    writeProfile({ businessName: 'Rama Studio', email: 'hi@rama.test', address: 'Jakarta' })
    localStorage.setItem('unrelated', 'value')

    const scan = scanInvoices()

    expect(scan.invoices).toHaveLength(2)
    expect(scan.corruptKeys).toEqual([])
  })
})
