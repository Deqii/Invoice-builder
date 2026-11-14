import { Input } from '@/components/ui/input'
import { formatUsd } from '@/lib/money'

interface InvoiceTotalsProps {
  subtotalMinor: number
  discountMinor: number
  taxMinor: number
  totalMinor: number
  discount: string
  tax: string
  discountError?: string
  taxError?: string
  onDiscountChange: (value: string) => void
  onTaxChange: (value: string) => void
}

function percentInput(
  id: string,
  label: string,
  value: string,
  error: string | undefined,
  onChange: (value: string) => void,
) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-body text-ink-muted">{label}</span>
        <div className="relative w-22 shrink-0">
          <Input
            id={id}
            aria-label={`${label} percent`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            inputMode="decimal"
            className="pr-7 text-right tabular-nums"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-body text-ink-muted">
            %
          </span>
        </div>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-right text-body text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function InvoiceTotals({
  subtotalMinor,
  discountMinor,
  taxMinor,
  totalMinor,
  discount,
  tax,
  discountError,
  taxError,
  onDiscountChange,
  onTaxChange,
}: InvoiceTotalsProps) {
  return (
    <div data-testid="totals" className="mt-6 flex justify-end">
      <div className="w-full sm:w-90">
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <span className="flex-1 text-body text-ink-muted">Subtotal</span>
            <span className="w-26 text-right text-body-medium tabular-nums">
              {formatUsd(subtotalMinor)}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {percentInput('discount', 'Discount', discount, discountError, onDiscountChange)}
            </div>
            <span className="w-26 pt-2 text-right text-body-medium tabular-nums">
              -{formatUsd(discountMinor)}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {percentInput('tax', 'Tax', tax, taxError, onTaxChange)}
            </div>
            <span className="w-26 pt-2 text-right text-body-medium tabular-nums">
              {formatUsd(taxMinor)}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line-strong pt-4">
            <span className="text-body-strong">Total due</span>
            <span className="text-total tabular-nums">{formatUsd(totalMinor)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
