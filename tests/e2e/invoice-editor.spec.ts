import { expect, test, type Page } from '@playwright/test'
import { freezeClock, seed } from '../visual/helpers'

const PROFILE = {
  businessName: 'Rama Studio',
  email: 'hello@ramastudio.example',
  address: 'Bandung, Indonesia',
}

async function seedEmpty(page: Page) {
  await page.addInitScript((profile) => {
    if (sessionStorage.getItem('__seeded')) return
    sessionStorage.setItem('__seeded', '1')
    localStorage.clear()
    localStorage.setItem('invoice-builder:v1:seller-profile', JSON.stringify(profile))
  }, PROFILE)
}

async function fillInvoice(page: Page, client = 'Acme') {
  await page.getByLabel('Client').fill(client)
  await page.getByLabel('Item 1 description').fill('Services')
  await page.getByLabel('Item 1 quantity').fill('1')
  await page.getByLabel('Item 1 rate').fill('100')
}

async function storedNumbers(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith('invoice-builder:v1:invoice:'))
      .map((key) => JSON.parse(localStorage.getItem(key) ?? '{}').number)
      .filter((number): number is string => typeof number === 'string'),
  )
}

test.describe('invoice editor', () => {
  test('saves a new invoice with the next seeded number and keeps it after reload', async ({
    page,
  }) => {
    await seed(page)
    await freezeClock(page)
    await page.goto('/invoices/new')
    await fillInvoice(page)

    await page.getByRole('button', { name: 'Save invoice' }).click()
    await expect(page).toHaveURL(/\/invoices\/[^/]+$/)
    expect((await storedNumbers(page)).sort()).toEqual([
      'INV-2026-011',
      'INV-2026-012',
      'INV-2026-013',
      'INV-2026-014',
      'INV-2026-015',
      'INV-2026-016',
    ])

    await page.reload()
    await expect(page.getByTestId('route-preview')).toBeVisible()

    await page.goto('/')
    await expect(page.getByRole('link', { name: 'INV-2026-016' })).toBeVisible()
  })

  test('assigns INV-2026-001 for the first invoice in an empty store', async ({ page }) => {
    await seedEmpty(page)
    await freezeClock(page)
    await page.goto('/invoices/new')
    await fillInvoice(page)

    await page.getByRole('button', { name: 'Save invoice' }).click()
    await expect(page).toHaveURL(/\/invoices\/[^/]+$/)
    expect(await storedNumbers(page)).toEqual(['INV-2026-001'])
  })

  test('keeps the number and status when an existing invoice is edited', async ({ page }) => {
    await seed(page)
    await freezeClock(page)
    await page.goto('/invoices/inv-014/edit')

    await page.getByLabel('Client').fill('Northwind Labs\nChanged line')
    await page.getByRole('button', { name: 'Save invoice' }).click()

    await expect(page).toHaveURL('/invoices/inv-014')
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('invoice-builder:v1:invoice:inv-014') ?? '{}'),
    )
    expect(stored.number).toBe('INV-2026-014')
    expect(stored.status).toBe('sent')
    expect(stored.billedTo).toBe('Northwind Labs\nChanged line')
  })

  test('keeps the number when the issue date changes', async ({ page }) => {
    await seed(page)
    await freezeClock(page)
    await page.goto('/invoices/inv-014/edit')

    await page.getByRole('button', { name: 'Issued date' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /October 21st, 2026/ }).click()
    await page.getByRole('button', { name: 'Save invoice' }).click()

    await expect(page).toHaveURL('/invoices/inv-014')
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('invoice-builder:v1:invoice:inv-014') ?? '{}'),
    )
    expect(stored.number).toBe('INV-2026-014')
    expect(stored.issuedDate).toBe('2026-10-21')
  })

  test('backdates to 2025 with the keyboard and gets a 2025 number', async ({ page }) => {
    await seedEmpty(page)
    await freezeClock(page)
    await page.goto('/invoices/new')
    await fillInvoice(page)

    const issued = page.getByRole('button', { name: 'Issued date' })
    await issued.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Shift+PageUp')
    await page.keyboard.press('Enter')
    await expect(issued).toHaveText('Oct 26, 2025')

    await page.getByRole('button', { name: 'Save invoice' }).click()
    await expect(page).toHaveURL(/\/invoices\/[^/]+$/)
    expect(await storedNumbers(page)).toEqual(['INV-2025-001'])
  })

  test('two tabs saving through the UI receive distinct numbers', async ({ context, page }) => {
    await seed(page)
    await freezeClock(page)
    await page.goto('/invoices/new')
    await fillInvoice(page, 'First Client')

    const second = await context.newPage()
    await second.goto('/invoices/new')
    await fillInvoice(second, 'Second Client')

    await Promise.all([
      page.getByRole('button', { name: 'Save invoice' }).click(),
      second.getByRole('button', { name: 'Save invoice' }).click(),
    ])

    await expect(page).toHaveURL(/\/invoices\/[^/]+$/)
    await expect(second).toHaveURL(/\/invoices\/[^/]+$/)

    const numbers = (await storedNumbers(page)).filter((number) =>
      ['INV-2026-016', 'INV-2026-017'].includes(number),
    )
    expect(numbers).toHaveLength(2)
    expect(new Set(numbers)).toEqual(new Set(['INV-2026-016', 'INV-2026-017']))

    await page.goto('/')
    for (const number of numbers) {
      await expect(page.getByRole('link', { name: number })).toBeVisible()
    }
  })

  test('keeps DOM ids unique and focuses a visible first invalid field', async ({ page }) => {
    await seed(page)
    await freezeClock(page)
    await page.goto('/invoices/new')

    await page.getByLabel('Client').fill('Acme')
    await page.getByRole('button', { name: 'Save invoice' }).click()

    const focused = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      const rect = active?.getBoundingClientRect()
      return {
        id: active?.id ?? '',
        visible: rect !== undefined && rect.width > 0 && rect.height > 0,
      }
    })
    expect(focused.id).toMatch(/^item-.*-description$/)
    expect(focused.visible).toBe(true)

    const ids = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id]')).map((element) => element.id),
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('shows a validation alert with the exact client message', async ({ page }) => {
    await seed(page)
    await freezeClock(page)
    await page.goto('/invoices/new')
    await page.getByRole('button', { name: 'Save invoice' }).click()

    await expect(page.getByText('Enter the client name on the first line.')).toBeVisible()
    await expect(page).toHaveURL('/invoices/new')
  })
})

test.describe('default due date under America/Los_Angeles', () => {
  test.use({ timezoneId: 'America/Los_Angeles' })

  test('crosses the month from Oct 26 to Nov 9', async ({ page }) => {
    await seed(page)
    await freezeClock(page)
    await page.goto('/invoices/new')

    await expect(page.getByRole('button', { name: 'Issued date' })).toHaveText('Oct 26, 2026')
    await expect(page.getByRole('button', { name: 'Due date' })).toHaveText('Nov 9, 2026')
  })
})

test.describe('default due date under Pacific/Kiritimati', () => {
  test.use({ timezoneId: 'Pacific/Kiritimati' })

  test('crosses the month from Oct 26 to Nov 9', async ({ page }) => {
    await seed(page)
    await freezeClock(page)
    await page.goto('/invoices/new')

    await expect(page.getByRole('button', { name: 'Issued date' })).toHaveText('Oct 26, 2026')
    await expect(page.getByRole('button', { name: 'Due date' })).toHaveText('Nov 9, 2026')
  })
})
