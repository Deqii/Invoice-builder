import { test } from '@playwright/test'
import { freezeClock, seed, shotPath } from './helpers'

test('invoice editor @shot', async ({ page }, testInfo) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/inv-014/edit')
  await page.evaluate(() => document.fonts.ready)

  await page.screenshot({
    path: shotPath(testInfo, 'editor'),
    fullPage: true,
    animations: 'disabled',
  })
})

test('new invoice editor @shot', async ({ page }, testInfo) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/new')
  await page.evaluate(() => document.fonts.ready)

  await page.screenshot({
    path: shotPath(testInfo, 'editor-new'),
    fullPage: true,
    animations: 'disabled',
  })
})
