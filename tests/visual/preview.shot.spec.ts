import { test } from '@playwright/test'
import { freezeClock, seed, shotPath } from './helpers'

test('invoice preview @shot', async ({ page }, testInfo) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/inv-014')
  await page.getByTestId('route-preview').waitFor()
  await page.evaluate(() => document.fonts.ready)

  await page.screenshot({
    path: shotPath(testInfo, 'preview'),
    fullPage: true,
    animations: 'disabled',
  })
})

test('invoice preview with empty notes @shot', async ({ page }, testInfo) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/inv-015')
  await page.getByTestId('route-preview').waitFor()
  await page.evaluate(() => document.fonts.ready)

  await page.screenshot({
    path: shotPath(testInfo, 'preview-empty-notes'),
    fullPage: true,
    animations: 'disabled',
  })
})
