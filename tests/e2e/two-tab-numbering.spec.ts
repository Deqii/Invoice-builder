import { expect, test } from '@playwright/test'
import { formatInvoiceNumber } from '../../src/lib/numbering'

test('two tabs saving at once never receive the same number', async ({ context }) => {
  const pageA = await context.newPage()
  const pageB = await context.newPage()
  await Promise.all([pageA.goto('/'), pageB.goto('/')])

  const saveTwentyFive = (page: typeof pageA) =>
    page.evaluate(async (): Promise<string[]> => {
      // @ts-expect-error browser-side Vite module URL, not a TypeScript specifier
      const { createInvoice } = await import('/src/lib/storage.ts')
      const numbers: string[] = []
      for (let index = 0; index < 25; index += 1) {
        const invoice = await createInvoice({
          id: crypto.randomUUID(),
          number: null,
          status: 'draft' as const,
          issuedDate: '2026-10-26',
          dueDate: '2026-11-09',
          billedTo: 'Concurrent Client',
          paymentMethod: 'Bank transfer',
          items: [
            {
              id: crypto.randomUUID(),
              description: 'Services',
              qtyHundredths: 100,
              rateMinor: 48000,
            },
          ],
          discountPercent: 0,
          taxPercent: 0,
          notes: '',
        })
        if (invoice.number !== null) numbers.push(invoice.number)
      }
      return numbers
    })

  const [numbersA, numbersB] = await Promise.all([saveTwentyFive(pageA), saveTwentyFive(pageB)])
  const numbers = [...numbersA, ...numbersB]

  expect(numbers).toHaveLength(50)
  expect(new Set(numbers).size).toBe(50)

  const expected = Array.from({ length: 50 }, (_, index) => formatInvoiceNumber(2026, index + 1))
  expect([...numbers].sort()).toEqual([...expected].sort())
})
