import { useState } from 'react'
import { useAppShell } from '@/components/app-shell-context'
import { InvoicePaper } from '@/components/invoice-paper'
import { Link } from '@/components/link'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { todayISO } from '@/lib/dates'
import { getInvoice, scanInvoices } from '@/lib/storage'
import { CORRUPT_MESSAGE } from '@/lib/storage-errors'
import { displayStatus } from '@/lib/status'
import type { Invoice } from '@/lib/types'
import { NotFound } from './not-found'

export function InvoicePreview({ id }: { id: string }) {
  const { profile } = useAppShell()
  const [corrupt] = useState(() => scanInvoices().corruptKeys.length > 0)
  const [invoice] = useState<Invoice | null>(() => {
    try {
      return getInvoice(id)
    } catch {
      return null
    }
  })

  if (invoice === null) return <NotFound />

  const number = invoice.number ?? 'Draft'
  const badge = displayStatus(invoice, todayISO())

  function handlePrint() {
    window.print()
  }

  return (
    <main className="mx-auto w-full max-w-preview px-4 pt-5 pb-10 sm:px-0 sm:pt-8 sm:pb-16 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="inline-block text-meta text-ink-muted hover:text-ink">
            ← Back to invoices
          </Link>
          <h1
            data-testid="route-preview"
            className="mt-1 flex items-center gap-3 text-page-title"
          >
            {number}
            <StatusBadge status={badge} />
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <Button asChild variant="outline" className="order-2 h-auto px-3.5">
            <Link href={`/invoices/${id}/edit`}>Edit</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="order-3 h-auto px-3.5"
          >
            Download PDF
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="order-1 col-span-2 h-auto px-3.5 sm:order-3 sm:col-span-1"
          >
            Print
          </Button>
        </div>
      </div>

      {corrupt ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-line bg-muted-bg px-4 py-3 text-body text-ink-muted print:hidden"
        >
          {CORRUPT_MESSAGE}
        </div>
      ) : null}

      <InvoicePaper invoice={invoice} profile={profile} />
    </main>
  )
}
