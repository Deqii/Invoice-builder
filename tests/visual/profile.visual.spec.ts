import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, freezeClock, seed, settle } from './helpers'

test('seller profile dialog', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Seller profile' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('profile.png', { fullPage: false })
})
