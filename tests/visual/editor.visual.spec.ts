import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, freezeClock, seed, settle } from './helpers'

test('invoice editor', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/inv-014/edit')
  await expect(page.getByRole('heading', { name: 'Edit invoice' })).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('editor.png', { fullPage: true })
})
