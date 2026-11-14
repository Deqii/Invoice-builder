import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedInvoices, sellerProfile } from '../../tests/fixtures/seed'
import App from '../App'
import { navigate } from '../lib/router'
import { STORAGE_KEYS, StorageFailure } from '../lib/storage'
import type { Invoice } from '../lib/types'

type LockRequest = (
  name: string,
  options: { mode: string },
  callback: () => unknown,
) => Promise<unknown>

function installLocks(request?: LockRequest) {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request:
        request ??
        ((_n: string, _o: unknown, fn: () => unknown) => Promise.resolve(fn())),
    },
  })
}

interface StoreOptions {
  invoices?: Invoice[]
  profile?: typeof sellerProfile | null
  counters?: Record<string, number> | null
}

function store({ invoices = [], profile = sellerProfile, counters = { '2026': 15 } }: StoreOptions) {
  localStorage.clear()
  if (profile) localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
  if (counters) localStorage.setItem(STORAGE_KEYS.counters, JSON.stringify(counters))
  for (const invoice of invoices) {
    localStorage.setItem(STORAGE_KEYS.invoicePrefix + invoice.id, JSON.stringify(invoice))
  }
}

function route(path: string) {
  window.history.replaceState({ __routerIndex: 0 }, '', path)
}

function invoiceKeys(): string[] {
  return Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_KEYS.invoicePrefix))
}

function storedInvoice(id: string): Invoice {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.invoicePrefix + id) ?? '{}') as Invoice
}

function heading() {
  return screen.getByRole('heading', { level: 1 })
}

function totals() {
  return screen.getByTestId('totals')
}

function issuedTrigger() {
  return screen.getByRole('button', { name: 'Issued date' })
}

function dueTrigger() {
  return screen.getByRole('button', { name: 'Due date' })
}

async function openNew(user: ReturnType<typeof userEvent.setup>, profile = sellerProfile) {
  store({ profile })
  route('/invoices/new')
  const view = render(<App />)
  await screen.findByRole('heading', { level: 1 })
  return { user, view }
}

async function openEdit(
  user: ReturnType<typeof userEvent.setup>,
  id: string,
  options: StoreOptions = { invoices: seedInvoices },
) {
  store(options)
  route(`/invoices/${id}/edit`)
  const view = render(<App />)
  await screen.findByRole('heading', { level: 1 })
  return { user, view }
}

async function fillValidNewInvoice(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Client'), 'Acme\nAttn: Jo')
  await user.type(screen.getByLabelText('Item 1 description'), 'Services')
  await user.type(screen.getByLabelText('Item 1 quantity'), '1')
  await user.type(screen.getByLabelText('Item 1 rate'), '100')
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 26, 12, 0, 0))
  window.history.replaceState({ __routerIndex: 0 }, '', '/')
  localStorage.clear()
  installLocks()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('new invoice defaults', () => {
  it('starts with today and today plus 14 days, one empty item and draft state', async () => {
    const user = userEvent.setup()
    await openNew(user)

    expect(heading()).toHaveTextContent('New invoice')
    expect(heading()).toHaveTextContent('Draft')
    expect(screen.getByLabelText('Invoice no.')).toHaveValue('Assigned when you save')
    expect(screen.getByLabelText('Invoice no.')).toHaveAttribute('readonly')
    expect(
      screen.getByText(
        'The invoice number is assigned when you first save and cannot be changed.',
      ),
    ).toBeInTheDocument()
    expect(issuedTrigger()).toHaveTextContent('Oct 26, 2026')
    expect(dueTrigger()).toHaveTextContent('Nov 9, 2026')
    expect(screen.getByLabelText('Payment method')).toHaveValue('Bank transfer')
    expect(screen.getByLabelText('Discount percent')).toHaveValue('0')
    expect(screen.getByLabelText('Tax percent')).toHaveValue('0')
    expect(screen.getByLabelText('Item 1 description')).toHaveValue('')
    expect(screen.getByLabelText('Notes (shown on the invoice)')).toHaveValue('')
  })
})

describe('existing invoice', () => {
  it('loads the stored invoice with its number and status badge', async () => {
    const user = userEvent.setup()
    await openEdit(user, 'inv-014')

    expect(heading()).toHaveTextContent('Edit invoice')
    expect(heading()).toHaveTextContent('Sent')
    expect(screen.getByLabelText('Invoice no.')).toHaveValue('INV-2026-014')
    expect(screen.getByLabelText('Client')).toHaveValue(
      'Northwind Labs\nAttn: Jamie Lee\n221 Market Street, Suite 4\nAustin, TX 78701, USA\nbilling@northwind.example',
    )
    expect(screen.getByLabelText('Item 1 description')).toHaveValue('Landing page design')
    expect(screen.getByLabelText('Item 2 quantity')).toHaveValue('24')
    expect(screen.getByLabelText('Item 2 rate')).toHaveValue('45.00')
    expect(screen.getByLabelText('Discount percent')).toHaveValue('10')
    expect(screen.getByLabelText('Tax percent')).toHaveValue('10')
  })
})

describe('live totals', () => {
  it('shows the worked example totals immediately', async () => {
    const user = userEvent.setup()
    await openEdit(user, 'inv-014')

    expect(within(totals()).getByText('$2,700.00')).toBeInTheDocument()
    expect(within(totals()).getByText('-$270.00')).toBeInTheDocument()
    expect(within(totals()).getByText('$243.00')).toBeInTheDocument()
    expect(within(totals()).getByText('$2,673.00')).toBeInTheDocument()
  })

  it('never shows NaN for partial or invalid input and treats invalid percentages as zero', async () => {
    const user = userEvent.setup()
    await openEdit(user, 'inv-014')

    await user.clear(screen.getByLabelText('Item 1 rate'))
    expect(within(totals()).getByText('$1,500.00')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Discount percent'))
    await user.type(screen.getByLabelText('Discount percent'), 'abc')
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    expect(within(totals()).getByText('-$0.00')).toBeInTheDocument()
    expect(within(totals()).getByText('$1,650.00')).toBeInTheDocument()
  })
})

describe('items', () => {
  it('adds and removes items and reports the empty list on save', async () => {
    const user = userEvent.setup()
    await openNew(user)

    await user.type(screen.getByLabelText('Client'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    expect(screen.getByLabelText('Item 2 description')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove item 2' }))
    expect(screen.queryByLabelText('Item 2 description')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove item 1' }))
    await user.click(screen.getByRole('button', { name: 'Save invoice' }))

    expect(screen.getByText('Add at least one item.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add item' })).toHaveFocus()
    expect(invoiceKeys()).toHaveLength(0)
  })

  it('normalizes a leading dot typed into quantity and computes from it', async () => {
    const user = userEvent.setup()
    await openNew(user)

    await user.type(screen.getByLabelText('Item 1 description'), 'Work')
    await user.type(screen.getByLabelText('Item 1 rate'), '100')
    await user.type(screen.getByLabelText('Item 1 quantity'), '.5')

    expect(screen.getByLabelText('Item 1 quantity')).toHaveValue('0.5')
    expect(within(totals()).getAllByText('$50.00')).toHaveLength(2)
  })

  it('normalizes a leading dot typed into rate', async () => {
    const user = userEvent.setup()
    await openNew(user)

    await user.type(screen.getByLabelText('Item 1 rate'), '.99')
    expect(screen.getByLabelText('Item 1 rate')).toHaveValue('0.99')
  })

  it('does not rewrite a negative leading dot and rejects it on save', async () => {
    const user = userEvent.setup()
    await openNew(user)
    await fillValidNewInvoice(user)

    const qty = screen.getByLabelText('Item 1 quantity')
    await user.clear(qty)
    await user.type(qty, '-.5')
    expect(qty).toHaveValue('-.5')

    await user.click(screen.getByRole('button', { name: 'Save invoice' }))
    expect(screen.getByText('Enter a quantity greater than 0.')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/invoices/new')
    expect(invoiceKeys()).toHaveLength(0)
  })

  it('leaves a trailing dot alone', async () => {
    const user = userEvent.setup()
    await openNew(user)

    await user.type(screen.getByLabelText('Item 1 quantity'), '5.')
    expect(screen.getByLabelText('Item 1 quantity')).toHaveValue('5.')
  })

  it('turns a lone dot into zero then appends the next digit', async () => {
    const user = userEvent.setup()
    await openNew(user)

    const qty = screen.getByLabelText('Item 1 quantity')
    await user.type(qty, '.')
    expect(qty).toHaveValue('0.')
    await user.type(qty, '5')
    expect(qty).toHaveValue('0.5')
  })
})

describe('validation on save', () => {
  it('shows the exact messages, focuses the first invalid field and does not navigate', async () => {
    const user = userEvent.setup()
    await openNew(user)

    await user.click(screen.getByRole('button', { name: 'Save invoice' }))

    expect(screen.getByText('Enter the client name on the first line.')).toBeInTheDocument()
    expect(screen.getByText('Enter an item description.')).toBeInTheDocument()
    expect(screen.getByText('Enter a quantity greater than 0.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid rate.')).toBeInTheDocument()
    expect(screen.getByLabelText('Client')).toHaveFocus()
    expect(screen.getByLabelText('Client')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Client')).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('billedTo-error'),
    )
    expect(window.location.pathname).toBe('/invoices/new')
    expect(invoiceKeys()).toHaveLength(0)
  })

  it('reports a due date selected before the issue date', async () => {
    const user = userEvent.setup()
    await openNew(user)
    await fillValidNewInvoice(user)

    await user.click(dueTrigger())
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Previous Month/ }))
    const earlier = within(dialog).getByRole('button', { name: /October 20th, 2026/ })
    fireEvent.click(earlier)
    await waitFor(() => expect(dueTrigger()).toHaveTextContent('Oct 20, 2026'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Save invoice' }))
    expect(screen.getByText('Due date cannot be before the issue date.')).toBeInTheDocument()
    expect(dueTrigger()).toHaveFocus()
  })

  it('reports a cleared issue date', async () => {
    const user = userEvent.setup()
    await openNew(user)
    await fillValidNewInvoice(user)

    await user.click(issuedTrigger())
    const dialog = await screen.findByRole('dialog')
    const selected = within(dialog).getByRole('button', { name: /, selected$/ })
    fireEvent.click(selected)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Save invoice' }))
    expect(screen.getByText('Choose an issue date.')).toBeInTheDocument()
    expect(issuedTrigger()).toHaveFocus()
  })
})

describe('saving', () => {
  it('creates a new invoice, assigns the first number and navigates to the preview', async () => {
    const user = userEvent.setup()
    await openNew(user, sellerProfile)
    store({ invoices: [], profile: sellerProfile, counters: null })
    await fillValidNewInvoice(user)

    const replace = vi.spyOn(window.history, 'replaceState')
    await user.click(screen.getByRole('button', { name: 'Save invoice' }))

    await waitFor(() => expect(window.location.pathname).toMatch(/^\/invoices\/[^/]+$/))
    const keys = invoiceKeys()
    expect(keys).toHaveLength(1)
    const created = JSON.parse(localStorage.getItem(keys[0]) ?? '{}') as Invoice
    expect(created.number).toBe('INV-2026-001')
    expect(created.status).toBe('draft')
    expect(replace).toHaveBeenCalledWith(
      expect.anything(),
      '',
      expect.stringMatching(/^\/invoices\/[^/]+$/),
    )
  })

  it('updates an existing invoice, keeps the number and status, and pushes the preview', async () => {
    const user = userEvent.setup()
    await openEdit(user, 'inv-015')

    const client = screen.getByLabelText('Client')
    await user.clear(client)
    await user.type(client, 'Meridian Cafe\nNew line')
    const push = vi.spyOn(window.history, 'pushState')
    await user.click(screen.getByRole('button', { name: 'Save invoice' }))

    await waitFor(() => expect(window.location.pathname).toBe('/invoices/inv-015'))
    const saved = storedInvoice('inv-015')
    expect(saved.number).toBe('INV-2026-015')
    expect(saved.status).toBe('draft')
    expect(saved.billedTo).toBe('Meridian Cafe\nNew line')
    expect(push).toHaveBeenCalledWith(
      expect.anything(),
      '',
      '/invoices/inv-015',
    )
  })

  it('round-trips quantity, rate, percent, number, status and createdAt without edits', async () => {
    const user = userEvent.setup()
    const roundTrip: Invoice = {
      id: 'round',
      number: 'INV-2026-020',
      status: 'sent',
      issuedDate: '2026-10-01',
      dueDate: '2026-10-15',
      billedTo: 'Acme',
      paymentMethod: 'Bank transfer',
      items: [
        { id: 'round-item', description: 'Retainer', qtyHundredths: 150, rateMinor: 12345 },
      ],
      discountPercent: 1250,
      taxPercent: 750,
      notes: '',
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-01T08:00:00.000Z',
    }
    await openEdit(user, 'round', { invoices: [roundTrip] })

    await user.click(screen.getByRole('button', { name: 'Save invoice' }))
    await waitFor(() => expect(window.location.pathname).toBe('/invoices/round'))

    const saved = storedInvoice('round')
    expect(saved.items[0].qtyHundredths).toBe(150)
    expect(saved.items[0].rateMinor).toBe(12345)
    expect(saved.discountPercent).toBe(1250)
    expect(saved.taxPercent).toBe(750)
    expect(saved.number).toBe('INV-2026-020')
    expect(saved.status).toBe('sent')
    expect(saved.createdAt).toBe('2026-10-01T08:00:00.000Z')
  })

  it('calls create once when Save is clicked twice while the write is in flight', async () => {
    const user = userEvent.setup()
    await openNew(user)
    await fillValidNewInvoice(user)

    let requests = 0
    let release: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    installLocks(async (_n, _o, callback) => {
      requests += 1
      await pending
      return callback()
    })

    const save = screen.getByRole('button', { name: 'Save invoice' })
    fireEvent.click(save)
    fireEvent.click(save)

    expect(requests).toBe(1)
    expect(save).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    release()
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/invoices\/[^/]+$/))
    expect(requests).toBe(1)
  })
})

describe('storage failures', () => {
  it.each([
    ['collision', 'Could not assign a unique invoice number. Please try saving again.'],
    [
      'no-locks',
      'Saving is not available in this browser. Please use a current version of Chrome, Edge, Firefox or Safari.',
    ],
    ['write', 'Could not save to this browser. Your changes are still here. Please try again.'],
    ['unavailable', 'Could not save to this browser. Your changes are still here. Please try again.'],
    ['parse', 'Could not save to this browser. Your changes are still here. Please try again.'],
    ['invalid', 'Could not save to this browser. Your changes are still here. Please try again.'],
  ] as const)('shows the %s alert and keeps the form', async (code, message) => {
    const user = userEvent.setup()
    await openNew(user)
    await fillValidNewInvoice(user)
    installLocks(async () => {
      throw new StorageFailure(code, 'nope')
    })

    await user.click(screen.getByRole('button', { name: 'Save invoice' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(window.location.pathname).toBe('/invoices/new')
    expect(screen.getByLabelText('Client')).toHaveValue('Acme\nAttn: Jo')
    expect(invoiceKeys()).toHaveLength(0)
  })
})

describe('profile card', () => {
  it('shows the current seller and opens the profile dialog', async () => {
    const user = userEvent.setup()
    await openNew(user)

    const card = screen.getByTestId('seller-card')
    expect(within(card).getByText('Rama Studio')).toBeInTheDocument()
    expect(within(card).getByText('Bandung, Indonesia')).toBeInTheDocument()
    expect(within(card).getByText('hello@ramastudio.example')).toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: 'Edit profile' }))
    expect(await screen.findByRole('heading', { name: 'Seller profile' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
  })

  it('updates the card after the profile is saved', async () => {
    const user = userEvent.setup()
    await openNew(user)

    await user.click(screen.getByRole('button', { name: 'Edit profile' }))
    const name = screen.getByLabelText('Business name')
    await user.clear(name)
    await user.type(name, 'Nusa Creative')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() =>
      expect(within(screen.getByTestId('seller-card')).getByText('Nusa Creative')).toBeInTheDocument(),
    )
  })

  it('blocks Save and shows the prompt when the profile is incomplete', async () => {
    const user = userEvent.setup()
    await openNew(user, null)

    const card = screen.getByTestId('seller-card')
    expect(
      within(card).getByText('Add your business details before creating an invoice.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save invoice' })).toBeDisabled()
  })
})

describe('date field', () => {
  it('opens with the keyboard, moves by day, selects and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    await openNew(user)

    const trigger = issuedTrigger()
    trigger.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    await user.keyboard('{ArrowRight}{Enter}')
    await waitFor(() => expect(trigger).toHaveTextContent('Oct 27, 2026'))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('closes on Escape without changing the date', async () => {
    const user = userEvent.setup()
    await openNew(user)

    const trigger = dueTrigger()
    trigger.focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveTextContent('Nov 9, 2026')
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('does not clear the due date when the selected day is clicked', async () => {
    const user = userEvent.setup()
    await openNew(user)

    await user.click(dueTrigger())
    const dialog = await screen.findByRole('dialog')
    const selected = within(dialog).getByRole('button', { name: /, selected$/ })
    fireEvent.click(selected)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(dueTrigger()).toHaveTextContent('Nov 9, 2026')
  })
})

describe('navigation and missing data', () => {
  it('keys the editor by route so switching invoices shows the new values', async () => {
    const user = userEvent.setup()
    await openEdit(user, 'inv-014')

    await act(async () => {
      navigate('/invoices/inv-015/edit')
    })
    await waitFor(() =>
      expect(screen.getByLabelText('Invoice no.')).toHaveValue('INV-2026-015'),
    )
    expect(screen.getByLabelText('Client')).toHaveValue('Meridian Cafe')

    await act(async () => {
      navigate('/invoices/inv-014/edit')
    })
    await waitFor(() =>
      expect(screen.getByLabelText('Invoice no.')).toHaveValue('INV-2026-014'),
    )
  })

  it('renders Not found for an unknown invoice id', async () => {
    store({ invoices: seedInvoices })
    route('/invoices/nope/edit')
    render(<App />)

    expect(await screen.findByTestId('route-not-found')).toBeInTheDocument()
  })

  it('shows the corrupt banner and disables Save when the store is corrupt', async () => {
    store({ invoices: [], profile: sellerProfile })
    localStorage.setItem(STORAGE_KEYS.invoicePrefix + 'corrupt', '{not json')
    route('/invoices/new')
    render(<App />)

    expect(await screen.findByText(/Some saved invoices could not be read/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save invoice' })).toBeDisabled()
  })

  it('cancels back to the list without saving a new invoice', async () => {
    store({ invoices: seedInvoices, profile: sellerProfile })
    route('/')
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    await user.click(screen.getByRole('button', { name: 'New invoice' }))
    await screen.findByRole('heading', { level: 1 })
    expect(window.location.pathname).toBe('/invoices/new')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(window.location.pathname).toBe('/'))
    expect(invoiceKeys()).toHaveLength(5)
  })
})

describe('accessibility', () => {
  it('keeps DOM ids unique and labels every item control', async () => {
    const user = userEvent.setup()
    await openEdit(user, 'inv-014')

    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(screen.getByLabelText('Item 1 description')).toHaveAttribute(
      'id',
      'item-item-014-1-description',
    )
    expect(screen.getByRole('button', { name: 'Remove item 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument()
    expect(issuedTrigger()).toHaveAttribute('aria-label', 'Issued date')
    expect(dueTrigger()).toHaveAttribute('aria-label', 'Due date')
  })
})
