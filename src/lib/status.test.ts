import { describe, expect, it } from 'vitest'
import { availableStatusAction, displayStatus, statusLabel } from './status'

describe('display status', () => {
  it('keeps a draft as draft even when the due date is past', () => {
    expect(displayStatus({ status: 'draft', dueDate: '2026-09-01' }, '2026-10-26')).toBe('draft')
  })

  it('marks a sent invoice overdue when the due date is before today', () => {
    expect(displayStatus({ status: 'sent', dueDate: '2026-09-29' }, '2026-10-26')).toBe('overdue')
  })

  it('keeps a sent invoice sent when the due date is today', () => {
    expect(displayStatus({ status: 'sent', dueDate: '2026-10-26' }, '2026-10-26')).toBe('sent')
  })

  it('keeps a paid invoice paid even when the due date is past', () => {
    expect(displayStatus({ status: 'paid', dueDate: '2026-09-01' }, '2026-10-26')).toBe('paid')
  })

  it('never marks an invoice with an invalid due date overdue and never throws', () => {
    expect(displayStatus({ status: 'sent', dueDate: 'not-a-date' }, '2026-10-26')).toBe('sent')
    expect(displayStatus({ status: 'sent', dueDate: '2026-02-30' }, '2026-10-26')).toBe('sent')
    expect(displayStatus({ status: 'sent', dueDate: '' }, '2026-10-26')).toBe('sent')
  })
})

describe('status labels', () => {
  it('returns the exact badge labels', () => {
    expect(statusLabel('draft')).toBe('Draft')
    expect(statusLabel('sent')).toBe('Sent')
    expect(statusLabel('paid')).toBe('Paid')
    expect(statusLabel('overdue')).toBe('Overdue')
  })
})

describe('available status actions', () => {
  it('maps each stored status to its single forward action', () => {
    expect(availableStatusAction('draft')).toBe('sent')
    expect(availableStatusAction('sent')).toBe('paid')
    expect(availableStatusAction('paid')).toBeNull()
  })
})
