import { expect, test } from '@playwright/test'
import { freezeClock, seed, shotPath } from './helpers'

test('invoice list with the actions menu @shot', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop only')

  await seed(page)
  await freezeClock(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Actions for INV-2026-014' }).click()

  const item = page.getByRole('menuitem', { name: 'Mark as paid' })
  await item.focus()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  await page.screenshot({
    path: shotPath(testInfo, 'list-menu'),
    fullPage: true,
    animations: 'disabled',
  })
})
