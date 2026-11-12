import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedInvoices, sellerProfile } from '../../tests/fixtures/seed'
import App from '../App'
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
    value: request ? { request } : { request: (_n: string, _o: unknown, fn: () => unknown) => Promise.resolve(fn()) },
  })
}

function store(invoices: Invoice[]) {
  localStorage.clear()
  localStorage.setItem(STORAGE_KEYS.counters, JSON.stringify({ '2026': 15 }))
  for (const invoice of invoices) {
    localStorage.setItem(STORAGE_KEYS.invoicePrefix + invoice.id, JSON.stringify(invoice))
  }
}

function storeProfile() {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(sellerProfile))
}

function makeInvoice(overrides: Partial<Invoice> & Pick<Invoice, 'id' | 'number'>): Invoice {
  return {
    status: 'draft',
    issuedDate: '2026-10-01',
    dueDate: '2026-10-15',
    billedTo: 'Acme',
    paymentMethod: 'Bank transfer',
    items: [{ id: `${overrides.id}-item`, description: 'Services', qtyHundredths: 100, rateMinor: 1000 }],
    discountPercent: 0,
    taxPercent: 0,
    notes: '',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  }
}

function table() {
  return screen.getByTestId('invoice-table')
}

function cards() {
  return screen.getByTestId('invoice-cards')
}

function row(id: string) {
  return within(table()).getByTestId(`row-${id}`)
}

async function openMenu(user: ReturnType<typeof userEvent.setup>, id: string) {
  const actionButton = within(row(id)).getByRole('button', { name: /^Actions for / })
  await user.click(actionButton)
  return screen.findByRole('menu')
}

function itemNames(menu: HTMLElement) {
  return within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.textContent)
}

async function settleProfile(initials: string) {
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Seller profile' })).toHaveTextContent(initials),
  )
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

describe('invoice list', () => {
  it('shows the invoice count with singular and plural forms', async () => {
    store(seedInvoices.slice(0, 5))
    render(<App />)
    expect(await screen.findByText('5 invoices')).toBeInTheDocument()
  })

  it('shows the singular form for one invoice', async () => {
    store(seedInvoices.slice(0, 1))
    render(<App />)
    expect(await screen.findByText('1 invoice')).toBeInTheDocument()
  })

  it('shows 0 invoices and the empty state when empty', async () => {
    store([])
    render(<App />)
    expect(await screen.findByText('0 invoices')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No invoices yet' })).toBeInTheDocument()
    expect(screen.getByText('Create your first invoice to get paid.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create your first invoice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New invoice' })).toBeInTheDocument()
  })

  it('sorts by parsed number, not by string', async () => {
    store([
      makeInvoice({ id: 'a', number: 'INV-2026-999' }),
      makeInvoice({ id: 'b', number: 'INV-2027-001' }),
      makeInvoice({ id: 'c', number: 'INV-2026-1000' }),
    ])
    render(<App />)
    await screen.findByText('3 invoices')
    const numbers = within(table())
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[0].textContent)
    expect(numbers).toEqual(['INV-2027-001', 'INV-2026-1000', 'INV-2026-999'])
  })

  it('renders the row fields', async () => {
    store(seedInvoices)
    render(<App />)
    const target = within(row('inv-014'))
    expect(target.getByRole('link', { name: 'INV-2026-014' })).toHaveAttribute(
      'href',
      '/invoices/inv-014',
    )
    expect(target.getByText('Northwind Labs')).toBeInTheDocument()
    expect(target.getByText('Oct 20, 2026')).toBeInTheDocument()
    expect(target.getByText('Nov 3, 2026')).toBeInTheDocument()
    expect(target.getByText('Sent')).toBeInTheDocument()
    expect(target.getByText('$2,673.00')).toBeInTheDocument()
    expect(target.getByRole('button', { name: 'Actions for INV-2026-014' })).toBeInTheDocument()
  })

  it('renders both the table and the cards with unique names per region', async () => {
    store(seedInvoices)
    render(<App />)
    await screen.findByText('5 invoices')
    expect(within(table()).getAllByRole('row')).toHaveLength(6)
    expect(within(cards()).getAllByTestId(/^card-/)).toHaveLength(5)
    expect(within(cards()).getByRole('link', { name: 'INV-2026-014' })).toBeInTheDocument()
  })

  it('opens the preview from the row', async () => {
    store(seedInvoices)
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    await user.click(within(row('inv-014')).getByText('Northwind Labs'))
    expect(window.location.pathname).toBe('/invoices/inv-014')
  })

  it('pushes a single history entry when the number link is clicked', async () => {
    store(seedInvoices)
    render(<App />)
    await screen.findByText('5 invoices')

    const push = vi.spyOn(window.history, 'pushState')
    fireEvent.click(within(row('inv-014')).getByRole('link', { name: 'INV-2026-014' }))
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('does not navigate when the actions button is clicked', async () => {
    store(seedInvoices)
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    await user.click(within(row('inv-014')).getByRole('button', { name: 'Actions for INV-2026-014' }))

    expect(window.location.pathname).toBe('/')
  })

  it('makes only the number link and the actions button focusable in a row', async () => {
    store(seedInvoices)
    render(<App />)
    await screen.findByText('5 invoices')
    const target = row('inv-014')
    expect(target.querySelectorAll('a, button')).toHaveLength(2)
    expect(target).not.toHaveAttribute('tabindex')
    for (const cell of Array.from(target.querySelectorAll('td'))) {
      expect(cell).not.toHaveAttribute('tabindex')
    }
  })

  it('shows the menu items for each stored status', async () => {
    store(seedInvoices)
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    let menu = await openMenu(user, 'inv-015')
    expect(itemNames(menu)).toEqual(['Edit', 'Duplicate', 'Mark as sent', 'Delete'])
    await user.keyboard('{Escape}')

    menu = await openMenu(user, 'inv-014')
    expect(itemNames(menu)).toEqual(['Edit', 'Duplicate', 'Mark as paid', 'Delete'])
    await user.keyboard('{Escape}')

    menu = await openMenu(user, 'inv-013')
    expect(itemNames(menu)).toEqual(['Edit', 'Duplicate', 'Delete'])
    await user.keyboard('{Escape}')

    menu = await openMenu(user, 'inv-012')
    expect(itemNames(menu)).toEqual(['Edit', 'Duplicate', 'Mark as paid', 'Delete'])
  })

  it('updates the badge only after the status write resolves', async () => {
    store(seedInvoices)
    let release: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    installLocks(async (_n, _o, callback) => {
      await pending
      return callback()
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    const menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Mark as sent' }))

    expect(within(row('inv-015')).getByText('Draft')).toBeInTheDocument()
    const reopened = await openMenu(user, 'inv-015')
    expect(within(reopened).getByRole('menuitem', { name: 'Mark as sent' })).toHaveAttribute(
      'data-disabled',
    )

    release()
    await waitFor(() => expect(within(row('inv-015')).getByText('Sent')).toBeInTheDocument())
  })

  it('disables Duplicate while the duplicate is in flight', async () => {
    store(seedInvoices)
    storeProfile()
    let release: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    installLocks(async (_n, _o, callback) => {
      await pending
      return callback()
    })
    const user = userEvent.setup()
    render(<App />)
    await settleProfile('RS')

    let menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }))

    menu = await openMenu(user, 'inv-015')
    expect(within(menu).getByRole('menuitem', { name: 'Duplicate' })).toHaveAttribute(
      'data-disabled',
    )

    release()
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/invoices\/.+\/edit$/))
  })

  it('disables Delete while the delete is in flight', async () => {
    store(seedInvoices)
    let release: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    installLocks(async (_n, _o, callback) => {
      await pending
      return callback()
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    const menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeDisabled()

    release()
    await waitFor(() => expect(screen.queryByTestId('row-inv-015')).not.toBeInTheDocument())
  })

  it('keeps the old status and shows an error when the status write fails', async () => {
    store(seedInvoices)
    installLocks(async () => {
      throw new StorageFailure('write', 'nope')
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    const menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Mark as sent' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save to this browser. Your changes are still here. Please try again.',
    )
    expect(within(row('inv-015')).getByText('Draft')).toBeInTheDocument()
  })

  it('duplicates with a complete profile and opens the editor', async () => {
    store(seedInvoices)
    storeProfile()
    const user = userEvent.setup()
    render(<App />)
    await settleProfile('RS')

    const menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }))

    await waitFor(() => expect(window.location.pathname).toMatch(/^\/invoices\/.+\/edit$/))
    const seedKeys = new Set(
      seedInvoices.map((invoice) => STORAGE_KEYS.invoicePrefix + invoice.id),
    )
    const created = Object.keys(localStorage).filter(
      (key) => key.startsWith(STORAGE_KEYS.invoicePrefix) && !seedKeys.has(key),
    )
    expect(created).toHaveLength(1)
    const stored = JSON.parse(localStorage.getItem(created[0]) ?? '{}') as Invoice
    expect(stored.number).toBe('INV-2026-016')
    expect(stored.status).toBe('draft')
  })

  it('gates duplicate with an incomplete profile and creates nothing on cancel', async () => {
    store(seedInvoices)
    const user = userEvent.setup()
    render(<App />)
    await settleProfile('IB')

    const menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }))

    expect(await screen.findByRole('heading', { name: 'Seller profile' })).toBeInTheDocument()
    expect(screen.getByText('Add your business details before creating an invoice.')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Seller profile' })).not.toBeInTheDocument(),
    )
    const invoiceKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith(STORAGE_KEYS.invoicePrefix),
    )
    expect(invoiceKeys).toHaveLength(5)
    expect(window.location.pathname).toBe('/')
  })

  it('gates New invoice with an incomplete profile', async () => {
    store(seedInvoices)
    const user = userEvent.setup()
    render(<App />)
    await settleProfile('IB')

    await user.click(screen.getByRole('button', { name: 'New invoice' }))
    expect(await screen.findByRole('heading', { name: 'Seller profile' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Seller profile' })).not.toBeInTheDocument(),
    )
    expect(window.location.pathname).toBe('/')
  })

  it('navigates to the new editor with a complete profile', async () => {
    store(seedInvoices)
    storeProfile()
    const user = userEvent.setup()
    render(<App />)
    await settleProfile('RS')

    await user.click(screen.getByRole('button', { name: 'New invoice' }))

    expect(window.location.pathname).toBe('/invoices/new')
  })

  it('gates the empty-state CTA with an incomplete profile', async () => {
    store([])
    const user = userEvent.setup()
    render(<App />)
    await settleProfile('IB')

    await user.click(screen.getByRole('button', { name: 'Create your first invoice' }))
    expect(await screen.findByRole('heading', { name: 'Seller profile' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('opens the profile from the avatar without the gate helper text', async () => {
    store(seedInvoices)
    storeProfile()
    const user = userEvent.setup()
    render(<App />)
    await settleProfile('RS')

    await user.click(screen.getByRole('button', { name: 'Seller profile' }))

    expect(await screen.findByRole('heading', { name: 'Seller profile' })).toBeInTheDocument()
    expect(
      screen.queryByText('Add your business details before creating an invoice.'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Business name')).toHaveValue('Rama Studio')
  })

  it('confirms delete, then removes the invoice and focuses the heading', async () => {
    store(seedInvoices)
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    let menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Delete invoice?')).toBeInTheDocument()
    expect(
      within(dialog).getByText('INV-2026-015 will be permanently deleted. This cannot be undone.'),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(within(table()).getAllByRole('row')).toHaveLength(6)

    menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }))
    const confirm = await screen.findByRole('alertdialog')
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(5))
    expect(localStorage.getItem(STORAGE_KEYS.invoicePrefix + 'inv-015')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Invoices' })).toHaveFocus()
    expect(screen.getByText('4 invoices')).toBeInTheDocument()
  })

  it('keeps the invoice and shows an error when delete fails', async () => {
    store(seedInvoices)
    installLocks(async () => {
      throw new StorageFailure('write', 'nope')
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    const menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save to this browser. Your changes are still here. Please try again.',
    )
    expect(within(table()).getAllByRole('row')).toHaveLength(6)
    expect(localStorage.getItem(STORAGE_KEYS.invoicePrefix + 'inv-015')).not.toBeNull()
  })

  it('shows the unique-number error when duplicate collides', async () => {
    store(seedInvoices)
    storeProfile()
    installLocks(async () => {
      throw new StorageFailure('collision', 'nope')
    })
    const user = userEvent.setup()
    render(<App />)
    await settleProfile('RS')

    const menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not assign a unique invoice number. Please try saving again.',
    )
    expect(window.location.pathname).toBe('/')
  })

  it('shows the browser-support error when Web Locks are missing', async () => {
    store(seedInvoices)
    installLocks(async () => {
      throw new StorageFailure(
        'no-locks',
        'Saving is not available in this browser. Please use a current version of Chrome, Edge, Firefox or Safari.',
      )
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    const menu = await openMenu(user, 'inv-015')
    await user.click(within(menu).getByRole('menuitem', { name: 'Mark as sent' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Saving is not available in this browser. Please use a current version of Chrome, Edge, Firefox or Safari.',
    )
  })

  it('shows the corrupt banner, keeps valid rows, and disables writes', async () => {
    store(seedInvoices)
    localStorage.setItem(STORAGE_KEYS.invoicePrefix + 'corrupt', '{not json')
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('5 invoices')

    expect(screen.getByText(/Some saved invoices could not be read/)).toBeInTheDocument()
    expect(within(table()).getAllByRole('row')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'New invoice' })).toBeDisabled()

    const menu = await openMenu(user, 'inv-015')
    expect(within(menu).getByRole('menuitem', { name: 'Duplicate' })).toHaveAttribute(
      'data-disabled',
    )
    expect(within(menu).getByRole('menuitem', { name: 'Mark as sent' })).toHaveAttribute(
      'data-disabled',
    )
    expect(within(menu).getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('data-disabled')
  })

  it('shows only the corrupt banner when there are no readable invoices', async () => {
    store([])
    localStorage.setItem(STORAGE_KEYS.invoicePrefix + 'corrupt', '{not json')
    render(<App />)
    await screen.findByText('0 invoices')

    expect(screen.getByText(/Some saved invoices could not be read/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'No invoices yet' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Create your first invoice' }),
    ).not.toBeInTheDocument()
  })
})
