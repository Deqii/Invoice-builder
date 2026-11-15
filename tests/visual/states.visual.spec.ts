import { expect, test, type Page } from '@playwright/test'
import {
  expectNoHorizontalOverflow,
  freezeClock,
  seed,
  seedEmpty,
  seedProfileOnly,
  settle,
} from './helpers'

function invoiceRow(page: Page, mobile: boolean) {
  return page
    .getByTestId(mobile ? 'invoice-cards' : 'invoice-table')
    .getByTestId(mobile ? 'card-inv-014' : 'row-inv-014')
}

test('empty invoice list', async ({ page }) => {
  await seedProfileOnly(page)
  await freezeClock(page)
  await page.goto('/')
  await expect(page.getByText('No invoices yet')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('empty-list.png', { fullPage: true })
})

test('delete confirmation dialog', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile'
  await seed(page)
  await freezeClock(page)
  await page.goto('/')
  await invoiceRow(page, mobile)
    .getByRole('button', { name: 'Actions for INV-2026-014' })
    .click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('delete-dialog.png', { fullPage: false })
})

test('validation errors', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/new')
  await page.getByRole('button', { name: 'Save invoice' }).click()
  await expect(page.getByText('Enter the client name on the first line.')).toBeVisible()
  await expect(page.getByLabel('Client')).toBeFocused()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('validation-errors.png', { fullPage: true })
})

test('first-run profile gate', async ({ page }) => {
  await seedEmpty(page)
  await freezeClock(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'New invoice' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('Add your business details before creating an invoice.')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('first-run-profile.png', { fullPage: false })
})

test('new invoice editor', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/new')
  await expect(page.getByLabel('Invoice no.')).toHaveValue('Assigned when you save')

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('new-invoice.png', { fullPage: true })
})

test('mobile row action menu', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile only')

  await seed(page)
  await freezeClock(page)
  await page.goto('/')
  await page
    .getByTestId('card-inv-014')
    .getByRole('button', { name: 'Actions for INV-2026-014' })
    .click()
  await expect(page.getByRole('menu')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('row-menu-mobile.png', { fullPage: false })
})

test('issued date picker', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/new')
  await page.getByRole('button', { name: 'Issued date' }).click()
  await expect(page.locator('[data-slot="popover-content"]')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('date-picker.png', { fullPage: false })
})

test('remove last item validation', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/new')
  await page.getByRole('button', { name: 'Remove item 1' }).click()
  await page.getByRole('button', { name: 'Save invoice' }).click()
  await expect(page.getByText('Add at least one item.')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('remove-last-item.png', { fullPage: true })
})

test('storage write error', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/new')
  await page.getByLabel('Client').fill('Acme')
  await page.getByLabel('Item 1 description').fill('Services')
  await page.getByLabel('Item 1 quantity').fill('1')
  await page.getByLabel('Item 1 rate').fill('100')

  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded')
    }
  })
  await page.getByRole('button', { name: 'Save invoice' }).click()
  await expect(page.getByRole('alert')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('storage-error.png', { fullPage: true })
})
