import { test } from '@playwright/test'
import { freezeClock, seed, shotPath } from './helpers'

test('invoice list @shot', async ({ page }, testInfo) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)

  await page.screenshot({
    path: shotPath(testInfo, 'list'),
    fullPage: true,
    animations: 'disabled',
  })
})
