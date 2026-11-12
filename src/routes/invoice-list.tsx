import { useRef, useState, type MouseEvent } from 'react'
import { Plus } from 'lucide-react'
import { useAppShell } from '@/components/app-shell-context'
import { DeleteInvoiceDialog } from '@/components/delete-invoice-dialog'
import { InvoiceActionsMenu } from '@/components/invoice-actions-menu'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, todayISO } from '@/lib/dates'
import { buildDuplicate, clientName, invoiceTotalMinor } from '@/lib/invoice'
import { formatUsd } from '@/lib/money'
import { sortInvoicesNewestFirst } from '@/lib/numbering'
import { Link } from '@/components/link'
import { navigate } from '@/lib/router'
import { displayStatus } from '@/lib/status'
import {
  createInvoice,
  deleteInvoice,
  scanInvoices,
  setInvoiceStatus,
  StorageFailure,
} from '@/lib/storage'
import type { Invoice, StoredStatus } from '@/lib/types'

type BusyAction = 'status' | 'duplicate' | 'delete'

const SAVE_ERROR = 'Could not save to this browser. Your changes are still here. Please try again.'
const COLLISION_ERROR = 'Could not assign a unique invoice number. Please try saving again.'
const NO_LOCKS_ERROR =
  'Saving is not available in this browser. Please use a current version of Chrome, Edge, Firefox or Safari.'
const CORRUPT_MESSAGE =
  'Some saved invoices could not be read, so they are not shown. Saving is disabled to protect your data.'

function storageError(failure: unknown): string {
  if (failure instanceof StorageFailure) {
    if (failure.code === 'no-locks') return NO_LOCKS_ERROR
    if (failure.code === 'collision') return COLLISION_ERROR
  }
  return SAVE_ERROR
}

export function InvoiceList() {
  const { runWithProfile } = useAppShell()
  const [scan, setScan] = useState(() => scanInvoices())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Record<string, BusyAction | null>>({})
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const corrupt = scan.corruptKeys.length > 0
  const invoices = sortInvoicesNewestFirst(scan.invoices)
  const today = todayISO()
  const countLabel = `${invoices.length} ${invoices.length === 1 ? 'invoice' : 'invoices'}`

  function refresh() {
    setScan(scanInvoices())
  }

  function setBusyAction(id: string, action: BusyAction | null) {
    setBusy((current) => ({ ...current, [id]: action }))
  }

  function openNewInvoice() {
    runWithProfile(() => navigate('/invoices/new'))
  }

  function openPreviewFromEvent(event: MouseEvent, invoice: Invoice) {
    const target = event.target as HTMLElement
    if (target.closest('a, button, [role="menuitem"]')) return
    const selection = window.getSelection?.()?.toString()
    if (selection) return
    navigate(`/invoices/${invoice.id}`)
  }

  async function handleStatus(invoice: Invoice, status: StoredStatus) {
    if (corrupt || busy[invoice.id]) return
    setError(null)
    setBusyAction(invoice.id, 'status')
    try {
      await setInvoiceStatus(invoice.id, status)
      refresh()
    } catch (failure) {
      setError(storageError(failure))
    } finally {
      setBusyAction(invoice.id, null)
    }
  }

  function handleDuplicate(invoice: Invoice) {
    if (corrupt || busy[invoice.id]) return
    runWithProfile(() => {
      void duplicate(invoice)
    })
  }

  async function duplicate(invoice: Invoice) {
    setError(null)
    setBusyAction(invoice.id, 'duplicate')
    try {
      const draft = buildDuplicate(invoice, todayISO())
      const created = await createInvoice(draft)
      refresh()
      navigate(`/invoices/${created.id}/edit`)
    } catch (failure) {
      setError(storageError(failure))
    } finally {
      setBusyAction(invoice.id, null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || busy[deleteTarget.id]) return
    const target = deleteTarget
    setError(null)
    setBusyAction(target.id, 'delete')
    try {
      await deleteInvoice(target.id)
      refresh()
      setDeleteTarget(null)
      headingRef.current?.focus()
    } catch (failure) {
      setDeleteTarget(null)
      setError(storageError(failure))
    } finally {
      setBusyAction(target.id, null)
    }
  }

  function actionsMenu(invoice: Invoice) {
    return (
      <InvoiceActionsMenu
        invoice={invoice}
        disabled={corrupt}
        busy={busy[invoice.id] ?? null}
        onOpenChange={() => {}}
        onEdit={() => navigate(`/invoices/${invoice.id}/edit`)}
        onDuplicate={() => handleDuplicate(invoice)}
        onStatus={(status) => void handleStatus(invoice, status)}
        onDelete={() => setDeleteTarget(invoice)}
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-list px-4 pt-5 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-page-title">
            Invoices
          </h1>
          <p className="mt-0.5 text-body text-ink-muted">{countLabel}</p>
        </div>
        <Button
          type="button"
          onClick={openNewInvoice}
          disabled={corrupt}
          title={corrupt ? CORRUPT_MESSAGE : undefined}
          className="h-9.5 w-full gap-1.5 px-3.5 has-[>svg]:px-3.5 sm:w-auto"
        >
          <Plus />
          New invoice
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mb-4 text-body text-danger">
          {error}
        </p>
      ) : null}

      {corrupt ? (
        <div role="status" className="mb-4 rounded-lg border border-line bg-muted-bg px-4 py-3 text-body text-ink-muted">
          {CORRUPT_MESSAGE}
        </div>
      ) : null}

      {!corrupt && invoices.length === 0 ? (
        <Card className="items-center gap-2 px-6 py-12 text-center">
          <h2 className="text-dialog-title text-ink">No invoices yet</h2>
          <p className="text-body text-ink-muted">Create your first invoice to get paid.</p>
          <Button type="button" className="mt-4 h-9.5 gap-1.5 px-3.5 has-[>svg]:px-3.5" onClick={openNewInvoice}>
            <Plus />
            Create your first invoice
          </Button>
        </Card>
      ) : null}

      {invoices.length > 0 ? (
        <>
          <Card data-testid="invoice-table" className="hidden gap-0 overflow-hidden py-0 sm:block">
            <Table>
              <colgroup>
                <col className="w-36" />
                <col />
                <col className="w-33" />
                <col className="w-33" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-14" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-ink-faint">Invoice</TableHead>
                  <TableHead className="text-ink-faint">Client</TableHead>
                  <TableHead className="text-ink-faint">Issued</TableHead>
                  <TableHead className="text-ink-faint">Due</TableHead>
                  <TableHead className="text-ink-faint">Status</TableHead>
                  <TableHead className="text-right text-ink-faint">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const status = displayStatus(invoice, today)
                  return (
                    <TableRow
                      key={invoice.id}
                      data-testid={`row-${invoice.id}`}
                      onClick={(event) => openPreviewFromEvent(event, invoice)}
                      className="cursor-pointer hover:bg-page has-aria-expanded:bg-muted-bg"
                    >
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="text-body-medium tabular-nums hover:text-brand"
                        >
                          {invoice.number ?? 'Draft'}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-0">
                        <span className="block truncate">{clientName(invoice.billedTo)}</span>
                      </TableCell>
                      <TableCell className="text-body text-ink-muted tabular-nums">
                        {formatDate(invoice.issuedDate)}
                      </TableCell>
                      <TableCell className="text-body text-ink-muted tabular-nums">
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell className="text-right text-body-medium tabular-nums">
                        {formatUsd(invoiceTotalMinor(invoice))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">{actionsMenu(invoice)}</div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          <div data-testid="invoice-cards" className="space-y-3 sm:hidden">
            {invoices.map((invoice) => {
              const status = displayStatus(invoice, today)
              return (
                <Card
                  key={invoice.id}
                  data-testid={`card-${invoice.id}`}
                  onClick={(event) => openPreviewFromEvent(event, invoice)}
                  className="cursor-pointer gap-0 p-4"
                >
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="text-body-medium tabular-nums hover:text-brand"
                    >
                      {invoice.number ?? 'Draft'}
                    </Link>
                    <StatusBadge status={status} />
                    <div className="-my-1.5 -mr-2 ml-auto">{actionsMenu(invoice)}</div>
                  </div>
                  <p className="mt-1 text-body">{clientName(invoice.billedTo)}</p>
                  <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                    <span className="text-body text-ink-muted tabular-nums">
                      Due {formatDate(invoice.dueDate)}
                    </span>
                    <span className="text-card-amount tabular-nums">
                      {formatUsd(invoiceTotalMinor(invoice))}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      ) : null}

      <DeleteInvoiceDialog
        open={deleteTarget !== null}
        invoiceNumber={deleteTarget?.number ?? ''}
        busy={deleteTarget ? busy[deleteTarget.id] === 'delete' : false}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
