import { expect, test } from '@playwright/test'
import { freezeClock, seed } from '../visual/helpers'

const ORDER = [
  { id: 'inv-015', number: 'INV-2026-015' },
  { id: 'inv-014', number: 'INV-2026-014' },
  { id: 'inv-013', number: 'INV-2026-013' },
  { id: 'inv-012', number: 'INV-2026-012' },
  { id: 'inv-011', number: 'INV-2026-011' },
]

function region(page: import('@playwright/test').Page, mobile: boolean) {
  return page.getByTestId(mobile ? 'invoice-cards' : 'invoice-table')
}

function row(page: import('@playwright/test').Page, mobile: boolean, id: string) {
  return region(page, mobile).getByTestId(`${mobile ? 'card' : 'row'}-${id}`)
}

async function open(page: import('@playwright/test').Page) {
  await seed(page)
  await freezeClock(page)
  await page.goto('/')
}

test('shows the seeded invoices newest first with their badges', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile'
  await open(page)

  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
  await expect(page.getByText('5 invoices')).toBeVisible()

  const rows = region(page, mobile).locator(`[data-testid^="${mobile ? 'card' : 'row'}-"]`)
  await expect(rows).toHaveCount(5)
  for (const [index, entry] of ORDER.entries()) {
    await expect(rows.nth(index)).toContainText(entry.number)
  }

  await expect(row(page, mobile, 'inv-014')).toContainText('Sent')
  await expect(row(page, mobile, 'inv-012')).toContainText('Overdue')

  const noScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )
  expect(noScroll).toBe(true)
})

test('only the table or only the cards is visible per viewport', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile'
  await open(page)

  await expect(region(page, mobile)).toBeVisible()
  await expect(region(page, !mobile)).toBeHidden()
})

test('marks an invoice as paid and keeps it after reload', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile'
  await open(page)

  await row(page, mobile, 'inv-014').getByRole('button', { name: 'Actions for INV-2026-014' }).click()
  await page.getByRole('menuitem', { name: 'Mark as paid' }).click()
  await expect(row(page, mobile, 'inv-014')).toContainText('Paid')

  await page.reload()
  await expect(row(page, mobile, 'inv-014')).toContainText('Paid')
})

test('deletes an invoice after confirmation and keeps it deleted after reload', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile'
  await open(page)

  await row(page, mobile, 'inv-015').getByRole('button', { name: 'Actions for INV-2026-015' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('INV-2026-015 will be permanently deleted. This cannot be undone.')
  await dialog.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('4 invoices')).toBeVisible()
  await expect(row(page, mobile, 'inv-015')).toHaveCount(0)

  await page.reload()
  await expect(page.getByText('4 invoices')).toBeVisible()
})

test('opens the preview from the number link', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile'
  await open(page)

  await row(page, mobile, 'inv-014').getByRole('link', { name: 'INV-2026-014' }).click()

  await expect(page).toHaveURL(/\/invoices\/inv-014$/)
  await expect(page.getByTestId('route-preview')).toBeVisible()
})

test('reloads every deep link on the correct route screen', async ({ page }) => {
  await open(page)

  await page.goto('/invoices/inv-014')
  await expect(page.getByTestId('route-preview')).toBeVisible()
  await expect(page).toHaveURL(/\/invoices\/inv-014$/)
  await page.reload()
  await expect(page.getByTestId('route-preview')).toBeVisible()
  await expect(page).toHaveURL(/\/invoices\/inv-014$/)

  await page.goto('/invoices/inv-014/edit')
  await expect(page.getByTestId('route-edit')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('route-edit')).toBeVisible()

  await page.goto('/invoices/new')
  await expect(page.getByTestId('route-new')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('route-new')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
})

test('walks the history list, preview, back, forward', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile'
  await open(page)

  await row(page, mobile, 'inv-014').getByRole('link', { name: 'INV-2026-014' }).click()
  await expect(page.getByTestId('route-preview')).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()

  await page.goForward()
  await expect(page.getByTestId('route-preview')).toBeVisible()
})

test('renders the not-found screen with a back link', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/nope')

  await expect(page.getByTestId('route-not-found')).toBeVisible()
  await page.getByRole('link', { name: '← Back to invoices' }).click()
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
})
