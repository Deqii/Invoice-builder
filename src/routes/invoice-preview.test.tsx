import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedInvoices, sellerProfile } from '../../tests/fixtures/seed'
import App from '../App'
import { navigate } from '../lib/router'
import { STORAGE_KEYS } from '../lib/storage'
import type { Invoice } from '../lib/types'

interface StoreOptions {
  invoices?: Invoice[]
  profile?: typeof sellerProfile | null
}

function store({ invoices = seedInvoices, profile = sellerProfile }: StoreOptions = {}) {
  localStorage.clear()
  if (profile) localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
  localStorage.setItem(STORAGE_KEYS.counters, JSON.stringify({ '2026': 15 }))
  for (const invoice of invoices) {
    localStorage.setItem(STORAGE_KEYS.invoicePrefix + invoice.id, JSON.stringify(invoice))
  }
}

function route(path: string) {
  window.history.replaceState({ __routerIndex: 0 }, '', path)
}

function customInvoice(patch: Partial<Invoice>): Invoice {
  return { ...seedInvoices[3], id: 'custom', number: 'INV-2026-099', ...patch }
}

async function openPreview(id = 'inv-014', options: StoreOptions = {}) {
  store(options)
  route(`/invoices/${id}`)
  const view = render(<App />)
  await screen.findByRole('heading', { level: 1 })
  return view
}

function heading() {
  return screen.getByRole('heading', { level: 1 })
}

function paper() {
  return screen.getByTestId('invoice-paper')
}

let printSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 26, 12, 0, 0))
  window.history.replaceState({ __routerIndex: 0 }, '', '/')
  localStorage.clear()
  printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('header', () => {
  it('shows the number, badge, back link and the three actions', async () => {
    await openPreview()

    expect(heading()).toHaveTextContent('INV-2026-014')
    expect(heading()).toHaveTextContent('Sent')
    expect(screen.getByRole('link', { name: '← Back to invoices' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/invoices/inv-014/edit',
    )
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument()
    expect(screen.getByTestId('route-preview')).toBe(heading())
  })

  it('makes both print buttons call window.print once each', async () => {
    const user = userEvent.setup()
    await openPreview()

    await user.click(screen.getByRole('button', { name: 'Print' }))
    expect(printSpy).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(printSpy).toHaveBeenCalledTimes(2)
  })
})

describe('paper', () => {
  it('shows the seller, the invoice title and the meta rows', async () => {
    await openPreview()

    const sheet = paper()
    expect(within(sheet).getByText('RS')).toBeInTheDocument()
    expect(within(sheet).getByText('Rama Studio')).toBeInTheDocument()
    expect(within(sheet).getByText('Bandung, Indonesia')).toBeInTheDocument()
    expect(within(sheet).getByText('hello@ramastudio.example')).toBeInTheDocument()
    expect(within(sheet).getByRole('heading', { name: 'Invoice' })).toBeInTheDocument()
    expect(within(sheet).getByText('Invoice no.')).toBeInTheDocument()
    expect(within(sheet).getByText('Issued')).toBeInTheDocument()
    expect(within(sheet).getByText('Due')).toBeInTheDocument()
    expect(within(sheet).getByText('Oct 20, 2026')).toBeInTheDocument()
    expect(within(sheet).getByText('Nov 3, 2026')).toBeInTheDocument()
  })

  it('keeps the whole billed to block and makes the first non-empty line strong', async () => {
    const owner = customInvoice({
      billedTo: '\n\n  Acme  \nLine two\n\nLine four\n',
    })
    await openPreview('custom', { invoices: [owner] })

    const first = within(paper()).getByText('Acme')
    expect(first.className).toContain('text-body-strong')
    expect(first.parentElement?.className).toContain('text-ink-muted')
    expect(first.parentElement?.className).toContain('whitespace-pre-wrap')
    expect(first.parentElement?.textContent).toBe('\n\nAcme\nLine two\n\nLine four\n')
  })

  it('shows the payment method, net days, currency and reference', async () => {
    await openPreview()

    const sheet = paper()
    expect(within(sheet).getByText('Bank transfer')).toBeInTheDocument()
    expect(within(sheet).getByText(/Net 14 days/)).toBeInTheDocument()
    expect(within(sheet).getByText(/Currency: USD/)).toBeInTheDocument()
    expect(within(sheet).getByText(/Reference: INV-2026-014/)).toBeInTheDocument()
  })

  it('shows Net 0 days and Net 14 days for same-day and two-week invoices', async () => {
    const sameDay = customInvoice({
      id: 'same-day',
      issuedDate: '2026-10-26',
      dueDate: '2026-10-26',
    })
    const view = await openPreview('same-day', { invoices: [sameDay] })
    expect(screen.getByText(/Net 0 days/)).toBeInTheDocument()
    view.unmount()

    const twoWeeks = customInvoice({
      id: 'two-weeks',
      issuedDate: '2026-10-26',
      dueDate: '2026-11-09',
    })
    await openPreview('two-weeks', { invoices: [twoWeeks] })
    expect(screen.getByText(/Net 14 days/)).toBeInTheDocument()
  })

  it('shows the item table and the worked example totals', async () => {
    await openPreview()

    const sheet = paper()
    for (const text of [
      'Landing page design',
      'Front-end implementation (React)',
      'Responsive QA and handoff',
      'Hosting setup',
      '$1,200.00',
      '$1,080.00',
      '$270.00',
      '$150.00',
      '$2,700.00',
      '-$270.00',
      '$243.00',
      '$2,673.00',
    ]) {
      expect(within(sheet).getAllByText(text).length).toBeGreaterThan(0)
    }
    expect(within(sheet).getByText('Discount (10%)')).toBeInTheDocument()
    expect(within(sheet).getByText('Tax (10%)')).toBeInTheDocument()
    expect(within(sheet).getByText('Total due')).toBeInTheDocument()
    expect(sheet.querySelectorAll('table th[scope="col"]')).toHaveLength(4)
  })

  it('shows a fractional percent label', async () => {
    const fractional = customInvoice({ discountPercent: 1250 })
    await openPreview('custom', { invoices: [fractional] })

    expect(screen.getByText('Discount (12.5%)')).toBeInTheDocument()
  })

  it('shows a negative zero difference when the discount is zero', async () => {
    await openPreview('inv-015')

    expect(screen.getByText('Discount (0%)')).toBeInTheDocument()
    expect(screen.getByText('-$0.00')).toBeInTheDocument()
  })

  it('shows the mobile qty times rate line without an hour suffix', async () => {
    await openPreview()

    const sheet = paper()
    expect(within(sheet).getByText('24 x $45.00')).toBeInTheDocument()
    expect(within(sheet).getByText('1 x $1,200.00')).toBeInTheDocument()
    expect(within(sheet).queryByText(/h x/)).not.toBeInTheDocument()
  })

  it('shows notes when present and hides them when empty or whitespace only', async () => {
    const seeded = await openPreview()
    expect(within(paper()).getByRole('heading', { name: 'Notes' })).toBeInTheDocument()
    expect(within(paper()).getByText(/Thank you for your business/)).toBeInTheDocument()
    seeded.unmount()

    const empty = customInvoice({ id: 'empty', notes: '' })
    const view = await openPreview('empty', { invoices: [empty] })
    expect(screen.queryByRole('heading', { name: 'Notes' })).not.toBeInTheDocument()
    view.unmount()

    const whitespace = customInvoice({ id: 'spaces', notes: '  \n\t ' })
    await openPreview('spaces', { invoices: [whitespace] })
    expect(screen.queryByRole('heading', { name: 'Notes' })).not.toBeInTheDocument()
  })

  it('uses the list fallback for a null invoice number everywhere', async () => {
    const draft = customInvoice({ number: null })
    await openPreview('custom', { invoices: [draft] })

    expect(heading()).toHaveTextContent('Draft')
    const sheet = paper()
    expect(within(sheet).getByText('Invoice no.').nextElementSibling).toHaveTextContent('Draft')
    expect(within(sheet).getByText(/Reference: Draft/)).toBeInTheDocument()
  })

  it('renders without crashing and without a seller block when the profile is null', async () => {
    await openPreview('inv-014', { profile: null })

    expect(heading()).toHaveTextContent('INV-2026-014')
    expect(within(paper()).getByRole('heading', { name: 'Invoice' })).toBeInTheDocument()
    expect(screen.queryByText('Rama Studio')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Add your business details before creating an invoice.'),
    ).not.toBeInTheDocument()
  })

  it('never renders NaN and keeps DOM ids unique', async () => {
    const owner = customInvoice({ discountPercent: 1250, taxPercent: 481 })
    await openPreview('custom', { invoices: [owner] })

    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('navigation and missing data', () => {
  it('shows NotFound for a missing invoice id', async () => {
    await openPreview('nope')

    expect(screen.getByTestId('route-not-found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Back to invoices' })).toBeInTheDocument()
    expect(screen.queryByTestId('route-preview')).not.toBeInTheDocument()
  })

  it('shows the corrupt banner while still showing a readable invoice', async () => {
    store({ invoices: seedInvoices })
    localStorage.setItem(STORAGE_KEYS.invoicePrefix + 'corrupt', '{not json')
    route('/invoices/inv-014')
    render(<App />)

    expect(await screen.findByText(/Some saved invoices could not be read/)).toBeInTheDocument()
    expect(heading()).toHaveTextContent('INV-2026-014')
    expect(paper()).toBeInTheDocument()
  })

  it('keys the preview by route so switching invoices shows the new paper', async () => {
    await openPreview('inv-014')

    await act(async () => {
      navigate('/invoices/inv-015')
    })
    await waitFor(() => expect(heading()).toHaveTextContent('INV-2026-015'))
    expect(within(paper()).getByText('Meridian Cafe')).toBeInTheDocument()
    expect(within(paper()).queryByText('Northwind Labs')).not.toBeInTheDocument()
  })
})

describe('dates in the local calendar', () => {
  it('shows the seeded dates and a 14 day term across the DST change', async () => {
    const custom = customInvoice({
      id: 'dst',
      issuedDate: '2026-10-26',
      dueDate: '2026-11-09',
    })
    await openPreview('dst', { invoices: [custom] })

    const sheet = paper()
    expect(within(sheet).getByText('Oct 26, 2026')).toBeInTheDocument()
    expect(within(sheet).getByText('Nov 9, 2026')).toBeInTheDocument()
    expect(within(sheet).getByText(/Net 14 days/)).toBeInTheDocument()
  })
})
