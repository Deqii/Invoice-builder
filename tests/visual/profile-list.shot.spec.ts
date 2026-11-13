import { expect, test } from '@playwright/test'
import { freezeClock, seed, shotPath } from './helpers'

test('invoice list with the profile dialog @shot', async ({ page }, testInfo) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Seller profile' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  await page.screenshot({
    path: shotPath(testInfo, 'profile-list'),
    fullPage: true,
    animations: 'disabled',
  })
})
