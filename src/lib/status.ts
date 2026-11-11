import type { Invoice, StoredStatus } from './types'
import { isBefore } from './dates'

export type DisplayStatus = StoredStatus | 'overdue'

export function displayStatus(
  invoice: Pick<Invoice, 'status' | 'dueDate'>,
  today: string,
): DisplayStatus {
  if (invoice.status === 'sent' && isBefore(invoice.dueDate, today)) return 'overdue'
  return invoice.status
}

export function statusLabel(status: DisplayStatus): 'Draft' | 'Sent' | 'Paid' | 'Overdue' {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'sent':
      return 'Sent'
    case 'paid':
      return 'Paid'
    case 'overdue':
      return 'Overdue'
  }
}

export function availableStatusAction(status: StoredStatus): 'sent' | 'paid' | null {
  if (status === 'draft') return 'sent'
  if (status === 'sent') return 'paid'
  return null
}
