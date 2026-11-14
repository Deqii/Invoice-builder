import { describe, expect, it } from 'vitest'
import {
  normalizeDecimalInput,
  validateInvoiceForm,
  type InvoiceFormValues,
} from './validation'

function validValues(overrides: Partial<InvoiceFormValues> = {}): InvoiceFormValues {
  return {
    issuedDate: '2026-10-26',
    dueDate: '2026-11-09',
    billedTo: 'Northwind Labs',
    paymentMethod: 'Bank transfer',
    items: [
      { id: 'item-1', description: 'Landing page design', qty: '1', rate: '1,200.00' },
    ],
    discount: '10',
    tax: '10',
    notes: '',
    ...overrides,
  }
}

function errorsFor(overrides: Partial<InvoiceFormValues>) {
  return validateInvoiceForm(validValues(overrides)).errors
}

describe('validateInvoiceForm', () => {
  it('returns no errors for a valid worked example', () => {
    const result = validateInvoiceForm(validValues())
    expect(result.errors).toEqual({})
    expect(result.firstInvalid).toBeNull()
  })

  it('requires an issue date', () => {
    expect(errorsFor({ issuedDate: '' }).issued).toBe('Choose an issue date.')
    expect(errorsFor({ issuedDate: '2026-13-01' }).issued).toBe('Choose an issue date.')
  })

  it('rejects a due date before the issue date', () => {
    expect(errorsFor({ issuedDate: '2026-10-26', dueDate: '2026-10-25' }).due).toBe(
      'Due date cannot be before the issue date.',
    )
  })

  it('rejects an invalid due date with the same message', () => {
    expect(errorsFor({ dueDate: '' }).due).toBe('Due date cannot be before the issue date.')
    expect(errorsFor({ dueDate: 'nope' }).due).toBe('Due date cannot be before the issue date.')
  })

  it('accepts a due date equal to the issue date', () => {
    expect(errorsFor({ issuedDate: '2026-10-26', dueDate: '2026-10-26' }).due).toBeUndefined()
  })

  it('requires a client on the first non-empty line', () => {
    expect(errorsFor({ billedTo: '' }).billedTo).toBe('Enter the client name on the first line.')
    expect(errorsFor({ billedTo: '  \n \n' }).billedTo).toBe(
      'Enter the client name on the first line.',
    )
    expect(errorsFor({ billedTo: '\n\nAcme' }).billedTo).toBeUndefined()
    expect(errorsFor({ billedTo: '  Acme  ' }).billedTo).toBeUndefined()
  })

  it('requires a payment method after trimming', () => {
    expect(errorsFor({ paymentMethod: '' }).paymentMethod).toBe('Enter a payment method.')
    expect(errorsFor({ paymentMethod: '   ' }).paymentMethod).toBe('Enter a payment method.')
  })

  it('requires at least one item', () => {
    const result = validateInvoiceForm(validValues({ items: [] }))
    expect(result.errors.items).toBe('Add at least one item.')
    expect(result.firstInvalid).toBe('items')
  })

  it('requires a non-empty item description', () => {
    const errors = errorsFor({
      items: [{ id: 'a', description: '   ', qty: '1', rate: '10' }],
    })
    expect(errors['item-a-description']).toBe('Enter an item description.')
  })

  it.each(['0', '-1', '1.001', '', '  ', 'abc', '.5'])('rejects qty %j', (qty) => {
    const errors = errorsFor({
      items: [{ id: 'a', description: 'Work', qty, rate: '10' }],
    })
    expect(errors['item-a-qty']).toBe('Enter a quantity greater than 0.')
  })

  it('accepts qty values up to the bound', () => {
    const errors = errorsFor({
      items: [{ id: 'a', description: 'Work', qty: '99999.99', rate: '10' }],
    })
    expect(errors['item-a-qty']).toBeUndefined()
    expect(
      errorsFor({ items: [{ id: 'a', description: 'Work', qty: '100000', rate: '10' }] })[
        'item-a-qty'
      ],
    ).toBe('Enter a quantity greater than 0.')
  })

  it.each(['-1', '1.001', '', 'abc', '.5'])('rejects rate %j', (rate) => {
    const errors = errorsFor({
      items: [{ id: 'a', description: 'Work', qty: '1', rate }],
    })
    expect(errors['item-a-rate']).toBe('Enter a valid rate.')
  })

  it('accepts rate values up to the bound', () => {
    expect(
      errorsFor({ items: [{ id: 'a', description: 'Work', qty: '1', rate: '999999.99' }] })[
        'item-a-rate'
      ],
    ).toBeUndefined()
    expect(
      errorsFor({ items: [{ id: 'a', description: 'Work', qty: '1', rate: '1000000' }] })[
        'item-a-rate'
      ],
    ).toBe('Enter a valid rate.')
  })

  it.each(['101', '1.001', '', 'abc', '-1'])('rejects discount %j', (discount) => {
    expect(errorsFor({ discount }).discount).toBe('Enter a discount from 0 to 100.')
  })

  it.each(['101', '1.001', '', 'abc', '-1'])('rejects tax %j', (tax) => {
    expect(errorsFor({ tax }).tax).toBe('Enter a tax from 0 to 100.')
  })

  it('accepts 0 and 100 percent values', () => {
    expect(errorsFor({ discount: '0', tax: '100' })).toEqual({})
  })

  it('reports the first invalid field in top-to-bottom order', () => {
    const result = validateInvoiceForm(
      validValues({
        issuedDate: '',
        billedTo: '',
        paymentMethod: '',
        discount: '200',
      }),
    )
    expect(result.firstInvalid).toBe('issued')
  })

  it('puts an item description error after the client and before qty', () => {
    const result = validateInvoiceForm(
      validValues({
        billedTo: '',
        items: [{ id: 'a', description: '', qty: '', rate: '' }],
      }),
    )
    expect(result.firstInvalid).toBe('billedTo')
  })

  it('orders item errors by item and field', () => {
    const result = validateInvoiceForm(
      validValues({
        items: [
          { id: 'a', description: 'Okay', qty: '', rate: '10' },
          { id: 'b', description: '', qty: '', rate: '' },
        ],
      }),
    )
    expect(result.firstInvalid).toBe('item-a-qty')
  })

  it('reports the add-item anchor when the list is empty even with other errors', () => {
    const result = validateInvoiceForm(validValues({ items: [], paymentMethod: '' }))
    expect(result.firstInvalid).toBe('paymentMethod')
    expect(result.errors.items).toBe('Add at least one item.')
  })
})

describe('normalizeDecimalInput', () => {
  it('prefixes a leading dot with zero', () => {
    expect(normalizeDecimalInput('.5')).toBe('0.5')
    expect(normalizeDecimalInput('-.5')).toBe('-.5')
    expect(normalizeDecimalInput('5.')).toBe('5.')
    expect(normalizeDecimalInput('')).toBe('')
  })
})
