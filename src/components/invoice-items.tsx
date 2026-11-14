import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatUsd, lineAmountMinor, parseMoneyInput, parseQtyInput } from '@/lib/money'
import { MAX_QTY_HUNDREDTHS, MAX_RATE_MINOR } from '@/lib/validation'

export interface EditorItem {
  id: string
  description: string
  qty: string
  rate: string
}

interface InvoiceItemsProps {
  items: EditorItem[]
  errors: Record<string, string>
  onChange: (id: string, patch: Partial<Omit<EditorItem, 'id'>>) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

function describedBy(id: string, error: string | undefined, helper?: string): string | undefined {
  const ids = [helper, error ? `${id}-error` : undefined].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

function fieldError(id: string, error: string | undefined) {
  if (!error) return null
  return (
    <p id={`${id}-error`} className="mt-1.5 text-body text-danger">
      {error}
    </p>
  )
}

function itemAmount(item: EditorItem): string {
  const qty = parseQtyInput(item.qty)
  const rate = parseMoneyInput(item.rate)
  if (qty === null || rate === null || qty > MAX_QTY_HUNDREDTHS || rate > MAX_RATE_MINOR) {
    return ''
  }
  return formatUsd(lineAmountMinor(qty, rate))
}

export function InvoiceItems({ items, errors, onChange, onRemove, onAdd }: InvoiceItemsProps) {
  return (
    <div>
      <div className="mb-2 hidden grid-cols-[1fr_80px_128px_120px_36px] gap-3 sm:grid">
        <span className="text-label uppercase text-ink-faint">Description</span>
        <span className="text-right text-label uppercase text-ink-faint">Qty</span>
        <span className="text-right text-label uppercase text-ink-faint">Rate</span>
        <span className="text-right text-label uppercase text-ink-faint">Amount</span>
        <span />
      </div>

      <div className="space-y-3 sm:space-y-2">
        {items.map((item, index) => {
          const number = index + 1
          const descriptionId = `item-${item.id}-description`
          const qtyId = `item-${item.id}-qty`
          const rateId = `item-${item.id}-rate`
          const descriptionError = errors[descriptionId]
          const qtyError = errors[qtyId]
          const rateError = errors[rateId]

          return (
            <div
              key={item.id}
              className="relative max-sm:rounded-lg max-sm:border max-sm:border-line max-sm:p-3 sm:grid sm:grid-cols-[1fr_80px_128px_120px_36px] sm:items-start sm:gap-3"
            >
              <span className="mb-2 block text-label uppercase text-ink-faint sm:hidden">
                Item {number}
              </span>

              <div>
                <Input
                  id={descriptionId}
                  aria-label={`Item ${number} description`}
                  aria-invalid={descriptionError ? true : undefined}
                  aria-describedby={describedBy(descriptionId, descriptionError)}
                  value={item.description}
                  onChange={(event) => onChange(item.id, { description: event.target.value })}
                />
                {fieldError(descriptionId, descriptionError)}
              </div>

              <div className="mt-3 grid grid-cols-[64px_1.3fr_1fr] gap-3 sm:contents sm:mt-0">
                <div>
                  <label htmlFor={qtyId} className="mb-1 block text-caption text-ink-faint sm:hidden">
                    Qty
                  </label>
                  <Input
                    id={qtyId}
                    aria-label={`Item ${number} quantity`}
                    aria-invalid={qtyError ? true : undefined}
                    aria-describedby={describedBy(qtyId, qtyError)}
                    inputMode="decimal"
                    maxLength={8}
                    className="text-right tabular-nums"
                    value={item.qty}
                    onChange={(event) => onChange(item.id, { qty: event.target.value })}
                  />
                  {fieldError(qtyId, qtyError)}
                </div>

                <div>
                  <label htmlFor={rateId} className="mb-1 block text-caption text-ink-faint sm:hidden">
                    Rate
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-ink-faint">
                      $
                    </span>
                    <Input
                      id={rateId}
                      aria-label={`Item ${number} rate`}
                      aria-invalid={rateError ? true : undefined}
                      aria-describedby={describedBy(rateId, rateError)}
                      inputMode="decimal"
                      maxLength={9}
                      className="pl-6 text-right tabular-nums"
                      value={item.rate}
                      onChange={(event) => onChange(item.id, { rate: event.target.value })}
                    />
                  </div>
                  {fieldError(rateId, rateError)}
                </div>

                <div>
                  <span className="mb-1 block text-right text-caption text-ink-faint sm:hidden">
                    Amount
                  </span>
                  <div className="pt-2 text-right text-body-medium tabular-nums">
                    {itemAmount(item)}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove item ${number}`}
                onClick={() => onRemove(item.id)}
                className="absolute top-2 right-2 size-9 text-ink-muted sm:static"
              >
                <Trash2 />
              </Button>
            </div>
          )
        })}
      </div>

      <Button
        id="items"
        type="button"
        variant="outline"
        size="sm"
        onClick={onAdd}
        className="mt-3 h-8 gap-1.5 rounded-lg px-3"
      >
        <Plus />
        Add item
      </Button>
    </div>
  )
}
