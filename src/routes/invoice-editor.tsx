import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAppShell } from '@/components/app-shell-context'
import { DateField } from '@/components/date-field'
import { InvoiceItems, type EditorItem } from '@/components/invoice-items'
import { InvoiceTotals } from '@/components/invoice-totals'
import { Link } from '@/components/link'
import { SellerCard } from '@/components/seller-card'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { addDaysISO, todayISO } from '@/lib/dates'
import { newId } from '@/lib/id'
import { computeTotals, formatPercent, formatQty, formatRateInput, parseMoneyInput, parsePercentInput, parseQtyInput } from '@/lib/money'
import { isProfileComplete } from '@/lib/profile'
import { goBack, navigate } from '@/lib/router'
import { createInvoice, getInvoice, scanInvoices, updateInvoice } from '@/lib/storage'
import { CORRUPT_MESSAGE, storageError } from '@/lib/storage-errors'
import { displayStatus } from '@/lib/status'
import type { Invoice } from '@/lib/types'
import {
  countableItem,
  normalizeDecimalInput,
  validateInvoiceForm,
  type InvoiceFormErrors,
  type InvoiceFormValues,
} from '@/lib/validation'
import { NotFound } from './not-found'

function emptyItem(): EditorItem {
  return { id: newId(), description: '', qty: '', rate: '' }
}

function newFormValues(): InvoiceFormValues {
  const today = todayISO()
  return {
    issuedDate: today,
    dueDate: addDaysISO(today, 14),
    billedTo: '',
    paymentMethod: 'Bank transfer',
    items: [emptyItem()],
    discount: '0',
    tax: '0',
    notes: '',
  }
}

function formValuesFromInvoice(invoice: Invoice): InvoiceFormValues {
  return {
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    billedTo: invoice.billedTo,
    paymentMethod: invoice.paymentMethod,
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      qty: formatQty(item.qtyHundredths),
      rate: formatRateInput(item.rateMinor),
    })),
    discount: formatPercent(invoice.discountPercent),
    tax: formatPercent(invoice.taxPercent),
    notes: invoice.notes,
  }
}

function Section({ children }: { children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-line pt-8 first:mt-0 first:border-t-0 first:pt-0">
      {children}
    </section>
  )
}

export function InvoiceEditor({ id }: { id?: string }) {
  const { profile } = useAppShell()
  const [corrupt] = useState(() => scanInvoices().corruptKeys.length > 0)
  const [invoice] = useState<Invoice | null | undefined>(() => {
    if (!id) return undefined
    try {
      return getInvoice(id)
    } catch {
      return null
    }
  })
  const [values, setValues] = useState<InvoiceFormValues>(() =>
    invoice ? formValuesFromInvoice(invoice) : newFormValues(),
  )
  const [errors, setErrors] = useState<InvoiceFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  if (id && invoice === null) return <NotFound />

  const profileComplete = isProfileComplete(profile)
  const today = todayISO()
  const badge = invoice ? displayStatus(invoice, today) : 'draft'

  const parsedItems = values.items.flatMap((item) => {
    const counted = countableItem(item)
    return counted ? [counted] : []
  })
  const totals = computeTotals(
    parsedItems,
    parsePercentInput(values.discount) ?? 0,
    parsePercentInput(values.tax) ?? 0,
  )

  function update<K extends keyof InvoiceFormValues>(key: K, value: InvoiceFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors({})
  }

  function updateItem(itemId: string, patch: Partial<Omit<EditorItem, 'id'>>) {
    const next = { ...patch }
    if (next.qty !== undefined) next.qty = normalizeDecimalInput(next.qty)
    if (next.rate !== undefined) next.rate = normalizeDecimalInput(next.rate)
    setValues((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, ...next } : item)),
    }))
    setErrors({})
  }

  function addItem() {
    setValues((current) => ({ ...current, items: [...current.items, emptyItem()] }))
    setErrors((current) => {
      if (!('items' in current)) return current
      const next = { ...current }
      delete next.items
      return next
    })
  }

  function removeItem(itemId: string) {
    setValues((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }))
    setErrors({})
  }

  function decimal(value: string, setter: (next: string) => void) {
    setter(normalizeDecimalInput(value))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    setFormError(null)

    const result = validateInvoiceForm(values)
    setErrors(result.errors)
    if (result.firstInvalid) {
      document.getElementById(result.firstInvalid)?.focus()
      return
    }
    if (corrupt || !profileComplete) return

    savingRef.current = true
    setSaving(true)
    try {
      const fields = {
        issuedDate: values.issuedDate,
        dueDate: values.dueDate,
        billedTo: values.billedTo,
        paymentMethod: values.paymentMethod.trim(),
        items: values.items.map((item) => ({
          id: item.id,
          description: item.description.trim(),
          qtyHundredths: parseQtyInput(item.qty) ?? 0,
          rateMinor: parseMoneyInput(item.rate) ?? 0,
        })),
        discountPercent: parsePercentInput(values.discount) ?? 0,
        taxPercent: parsePercentInput(values.tax) ?? 0,
        notes: values.notes,
      }

      if (invoice) {
        const updated = await updateInvoice({ ...invoice, ...fields })
        navigate(`/invoices/${updated.id}`)
      } else {
        const created = await createInvoice({ id: newId(), status: 'draft', ...fields })
        navigate(`/invoices/${created.id}`, { replace: true })
      }
    } catch (failure) {
      setFormError(storageError(failure))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-editor px-4 pt-5 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
      <div className="mb-6">
        <Link href="/" className="text-meta text-ink-muted hover:text-ink">
          ← Back to invoices
        </Link>
        <h1 className="mt-1 flex items-center gap-3 text-page-title">
          {invoice ? 'Edit invoice' : 'New invoice'}
          <StatusBadge status={badge} />
        </h1>
      </div>

      {formError ? (
        <p role="alert" className="mb-4 text-body text-danger">
          {formError}
        </p>
      ) : null}

      {corrupt ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-line bg-muted-bg px-4 py-3 text-body text-ink-muted"
        >
          {CORRUPT_MESSAGE}
        </div>
      ) : null}

      <form
        id="invoice-form"
        noValidate
        onSubmit={handleSubmit}
        className="rounded-xl border border-line bg-paper p-5 shadow-paper sm:p-8"
      >
        <Section>
          <h2 className="mb-3 text-label uppercase text-ink-faint">Invoice</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="invoiceNumber" className="mb-1.5 text-body-medium">
                Invoice no.
              </Label>
              <Input
                id="invoiceNumber"
                readOnly
                aria-describedby="invoiceNumber-help"
                className="tabular-nums"
                value={invoice?.number ?? 'Assigned when you save'}
              />
            </div>
            <DateField
              id="issued"
              label="Issued"
              ariaLabel="Issued date"
              value={values.issuedDate}
              onChange={(next) => update('issuedDate', next)}
              error={errors.issued}
            />
            <DateField
              id="due"
              label="Due"
              ariaLabel="Due date"
              value={values.dueDate}
              onChange={(next) => update('dueDate', next)}
              error={errors.due}
              required
            />
          </div>
          <p id="invoiceNumber-help" className="mt-1.5 text-meta text-ink-faint">
            The invoice number is assigned when you first save and cannot be changed.
          </p>
        </Section>

        <Section>
          <h2 className="mb-3 text-label uppercase text-ink-faint">From</h2>
          <SellerCard />
        </Section>

        <Section>
          <h2 className="mb-3 text-label uppercase text-ink-faint">Billed to</h2>
          <Label htmlFor="billedTo" className="mb-1.5 text-body-medium">
            Client
          </Label>
          <Textarea
            id="billedTo"
            rows={5}
            className="field-sizing-fixed"
            aria-invalid={errors.billedTo ? true : undefined}
            aria-describedby={
              errors.billedTo ? 'billedTo-help billedTo-error' : 'billedTo-help'
            }
            value={values.billedTo}
            onChange={(event) => update('billedTo', event.target.value)}
          />
          <p id="billedTo-help" className="mt-1.5 text-meta text-ink-faint">
            The first line is the client name in the invoice list.
          </p>
          {errors.billedTo ? (
            <p id="billedTo-error" className="mt-1.5 text-body text-danger">
              {errors.billedTo}
            </p>
          ) : null}
        </Section>

        <Section>
          <h2 className="mb-3 text-label uppercase text-ink-faint">Payment</h2>
          <Label htmlFor="paymentMethod" className="mb-1.5 text-body-medium">
            Payment method
          </Label>
          <Input
            id="paymentMethod"
            aria-invalid={errors.paymentMethod ? true : undefined}
            aria-describedby={
              errors.paymentMethod
                ? 'paymentMethod-help paymentMethod-error'
                : 'paymentMethod-help'
            }
            value={values.paymentMethod}
            onChange={(event) => update('paymentMethod', event.target.value)}
          />
          <p id="paymentMethod-help" className="mt-1.5 text-meta text-ink-faint">
            Net days, currency and reference are filled in automatically.
          </p>
          {errors.paymentMethod ? (
            <p id="paymentMethod-error" className="mt-1.5 text-body text-danger">
              {errors.paymentMethod}
            </p>
          ) : null}
        </Section>

        <Section>
          <h2 className="mb-3 text-label uppercase text-ink-faint">Items</h2>
          <InvoiceItems
            items={values.items}
            errors={errors}
            onChange={updateItem}
            onRemove={removeItem}
            onAdd={addItem}
          />
          {errors.items ? (
            <p id="items-error" className="mt-1.5 text-body text-danger">
              {errors.items}
            </p>
          ) : null}
          <InvoiceTotals
            subtotalMinor={totals.subtotalMinor}
            discountMinor={totals.discountMinor}
            taxMinor={totals.taxMinor}
            totalMinor={totals.totalMinor}
            discount={values.discount}
            tax={values.tax}
            discountError={errors.discount}
            taxError={errors.tax}
            onDiscountChange={(next) => decimal(next, (value) => update('discount', value))}
            onTaxChange={(next) => decimal(next, (value) => update('tax', value))}
          />
        </Section>

        <Section>
          <h2 className="mb-3 text-label uppercase text-ink-faint">Notes</h2>
          <Label htmlFor="notes" className="mb-1.5 text-body-medium">
            Notes (shown on the invoice)
          </Label>
          <Textarea
            id="notes"
            rows={3}
            className="field-sizing-fixed"
            value={values.notes}
            onChange={(event) => update('notes', event.target.value)}
          />
        </Section>
      </form>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => goBack()}
          disabled={saving}
          className="order-2 h-9 px-3.5 sm:order-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="invoice-form"
          disabled={saving || corrupt || !profileComplete}
          className="order-1 h-9 px-3.5 sm:order-2"
        >
          Save invoice
        </Button>
      </div>
    </main>
  )
}
