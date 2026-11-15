import { LogoMark } from '@/components/logo-mark'
import { formatDate, netDays } from '@/lib/dates'
import { computeTotals, formatPercent, formatQty, formatUsd } from '@/lib/money'
import { isProfileComplete } from '@/lib/profile'
import type { Invoice, SellerProfile } from '@/lib/types'

function BilledTo({ billedTo }: { billedTo: string }) {
  const lines = billedTo.split(/\r?\n/)
  const firstIndex = lines.findIndex((line) => line.trim() !== '')

  if (firstIndex < 0) {
    return <p className="whitespace-pre-wrap text-body text-ink-muted">{billedTo}</p>
  }

  const before = lines.slice(0, firstIndex).join('\n') + (firstIndex > 0 ? '\n' : '')
  const first = lines[firstIndex].trim()
  const rest = lines.slice(firstIndex + 1)
  const after = rest.length > 0 ? `\n${rest.join('\n')}` : ''

  return (
    <p className="whitespace-pre-wrap text-body text-ink-muted">
      {before}
      <span className="text-body-strong text-ink">{first}</span>
      {after}
    </p>
  )
}

export function InvoicePaper({
  invoice,
  profile,
}: {
  invoice: Invoice
  profile: SellerProfile | null
}) {
  const number = invoice.number ?? 'Draft'
  const totals = computeTotals(invoice.items, invoice.discountPercent, invoice.taxPercent)
  const seller = isProfileComplete(profile) ? profile : null

  return (
    <article
      data-testid="invoice-paper"
      className="rounded-xl border border-line bg-paper p-6 px-5 shadow-paper sm:p-12 print:rounded-none print:border-0 print:py-0 print:shadow-none"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        {seller ? (
          <div>
            <div className="mb-3">
              <LogoMark businessName={seller.businessName} />
            </div>
            <p className="text-body-strong">{seller.businessName}</p>
            <p className="whitespace-pre-line text-body text-ink-muted">{seller.address}</p>
            <p className="text-body text-ink-muted">{seller.email}</p>
          </div>
        ) : null}

        <div>
          <h2 className="text-doc-title sm:text-right">Invoice</h2>
          <dl className="mt-3 grid gap-1">
            <div className="flex justify-between gap-4 sm:justify-end">
              <dt className="text-body text-ink-faint">Invoice no.</dt>
              <dd className="text-body-medium tabular-nums sm:min-w-26 sm:text-right">{number}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:justify-end">
              <dt className="text-body text-ink-faint">Issued</dt>
              <dd className="text-body-medium sm:min-w-26 sm:text-right">
                {formatDate(invoice.issuedDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 sm:justify-end">
              <dt className="text-body text-ink-faint">Due</dt>
              <dd className="text-body-medium sm:min-w-26 sm:text-right">
                {formatDate(invoice.dueDate)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-10 grid gap-6 border-t border-line pt-6 max-sm:mt-7 sm:grid-cols-2 sm:gap-8">
        <section>
          <h3 className="mb-2 text-label uppercase text-ink-faint">Billed to</h3>
          <BilledTo billedTo={invoice.billedTo} />
        </section>
        <section>
          <h3 className="mb-2 text-label uppercase text-ink-faint">Payment</h3>
          <p className="text-body-strong">{invoice.paymentMethod}</p>
          <p className="text-body text-ink-muted">
            Net {netDays(invoice.issuedDate, invoice.dueDate)} days
            <br />
            Currency: USD
            <br />
            Reference: {number}
          </p>
        </section>
      </div>

      <table className="mt-8 w-full border-collapse text-body">
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b border-line-strong pb-3 text-left text-label uppercase text-ink-faint"
            >
              Description
            </th>
            <th
              scope="col"
              className="w-18 border-b border-line-strong pb-3 text-right text-label uppercase text-ink-faint max-sm:hidden"
            >
              Qty
            </th>
            <th
              scope="col"
              className="w-30 border-b border-line-strong pb-3 text-right text-label uppercase text-ink-faint max-sm:hidden"
            >
              Rate
            </th>
            <th
              scope="col"
              className="w-30 border-b border-line-strong pb-3 text-right text-label uppercase text-ink-faint max-sm:w-auto"
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={item.id} className="print:break-inside-avoid">
              <td className="border-b border-line py-4 align-top">
                <span className="block text-body-medium">{item.description}</span>
                <span className="mt-0.5 block text-meta text-ink-faint tabular-nums sm:hidden">
                  {formatQty(item.qtyHundredths)} x {formatUsd(item.rateMinor)}
                </span>
              </td>
              <td className="border-b border-line py-4 text-right align-top tabular-nums max-sm:hidden">
                {formatQty(item.qtyHundredths)}
              </td>
              <td className="border-b border-line py-4 text-right align-top tabular-nums max-sm:hidden">
                {formatUsd(item.rateMinor)}
              </td>
              <td className="border-b border-line py-4 text-right align-top tabular-nums">
                {formatUsd(totals.lines[index])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="grid w-full gap-2.5 sm:w-75">
          <div className="flex justify-between">
            <dt className="text-body text-ink-muted">Subtotal</dt>
            <dd className="text-body-medium tabular-nums">{formatUsd(totals.subtotalMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-body text-ink-muted">
              Discount ({formatPercent(invoice.discountPercent)}%)
            </dt>
            <dd className="text-body-medium tabular-nums">-{formatUsd(totals.discountMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-body text-ink-muted">
              Tax ({formatPercent(invoice.taxPercent)}%)
            </dt>
            <dd className="text-body-medium tabular-nums">{formatUsd(totals.taxMinor)}</dd>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between border-t border-line-strong pt-4">
            <dt className="text-body-strong">Total due</dt>
            <dd className="text-total tabular-nums">{formatUsd(totals.totalMinor)}</dd>
          </div>
        </dl>
      </div>

      {invoice.notes.trim() !== '' ? (
        <section className="mt-10 border-t border-line pt-6">
          <h3 className="mb-2 text-label uppercase text-ink-faint">Notes</h3>
          <p className="max-w-130 whitespace-pre-line text-body text-ink-muted">{invoice.notes}</p>
        </section>
      ) : null}
    </article>
  )
}
