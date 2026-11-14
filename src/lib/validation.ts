import { isBefore, isValidISODate } from './dates'
import { clientName } from './invoice'
import { parseMoneyInput, parsePercentInput, parseQtyInput } from './money'

export interface InvoiceFormValues {
  issuedDate: string
  dueDate: string
  billedTo: string
  paymentMethod: string
  items: Array<{ id: string; description: string; qty: string; rate: string }>
  discount: string
  tax: string
  notes: string
}

export interface InvoiceFormErrors {
  [field: string]: string
}

export const MAX_QTY_HUNDREDTHS = 9_999_999
export const MAX_RATE_MINOR = 99_999_999

export function normalizeDecimalInput(value: string): string {
  return value.startsWith('.') ? `0${value}` : value
}

export function countableItem(item: { qty: string; rate: string }): {
  qtyHundredths: number
  rateMinor: number
} | null {
  const qty = parseQtyInput(item.qty)
  const rate = parseMoneyInput(item.rate)
  if (qty === null || rate === null || qty > MAX_QTY_HUNDREDTHS || rate > MAX_RATE_MINOR) {
    return null
  }
  return { qtyHundredths: qty, rateMinor: rate }
}

function itemErrorKey(id: string, field: 'description' | 'qty' | 'rate'): string {
  return `item-${id}-${field}`
}

export function validateInvoiceForm(values: InvoiceFormValues): {
  errors: InvoiceFormErrors
  firstInvalid: string | null
} {
  const errors: InvoiceFormErrors = {}

  if (!isValidISODate(values.issuedDate)) {
    errors.issued = 'Choose an issue date.'
  }

  if (
    !isValidISODate(values.dueDate) ||
    (isValidISODate(values.issuedDate) && isBefore(values.dueDate, values.issuedDate))
  ) {
    errors.due = 'Due date cannot be before the issue date.'
  }

  if (clientName(values.billedTo) === '') {
    errors.billedTo = 'Enter the client name on the first line.'
  }

  if (values.paymentMethod.trim() === '') {
    errors.paymentMethod = 'Enter a payment method.'
  }

  if (values.items.length === 0) {
    errors.items = 'Add at least one item.'
  } else {
    for (const item of values.items) {
      if (item.description.trim() === '') {
        errors[itemErrorKey(item.id, 'description')] = 'Enter an item description.'
      }
      const qty = parseQtyInput(item.qty)
      if (qty === null || qty > MAX_QTY_HUNDREDTHS) {
        errors[itemErrorKey(item.id, 'qty')] = 'Enter a quantity greater than 0.'
      }
      const rate = parseMoneyInput(item.rate)
      if (rate === null || rate > MAX_RATE_MINOR) {
        errors[itemErrorKey(item.id, 'rate')] = 'Enter a valid rate.'
      }
    }
  }

  if (parsePercentInput(values.discount) === null) {
    errors.discount = 'Enter a discount from 0 to 100.'
  }

  if (parsePercentInput(values.tax) === null) {
    errors.tax = 'Enter a tax from 0 to 100.'
  }

  const order: string[] = ['issued', 'due', 'billedTo', 'paymentMethod', 'items']
  for (const item of values.items) {
    order.push(
      itemErrorKey(item.id, 'description'),
      itemErrorKey(item.id, 'qty'),
      itemErrorKey(item.id, 'rate'),
    )
  }
  order.push('discount', 'tax')

  const firstInvalid = order.find((key) => key in errors) ?? null
  return { errors, firstInvalid }
}
