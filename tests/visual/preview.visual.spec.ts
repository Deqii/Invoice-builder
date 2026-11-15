import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, freezeClock, seed, settle } from './helpers'

test('invoice preview', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/inv-014')
  await expect(page.getByTestId('route-preview')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('preview.png', { fullPage: true })
})

test('invoice preview with empty notes', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/inv-015')
  await expect(page.getByTestId('route-preview')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('preview-empty-notes.png', { fullPage: true })
})
