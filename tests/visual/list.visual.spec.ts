import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, freezeClock, seed, settle } from './helpers'

test('invoice list', async ({ page }) => {
  await seed(page)
  await freezeClock(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('list.png', { fullPage: true })
})

test('invoice list with the actions menu', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop only')

  await seed(page)
  await freezeClock(page)
  await page.goto('/')
  await page.addStyleTag({
    content: '[data-testid="row-inv-014"]{transition:none!important}',
  })
  await page
    .getByTestId('invoice-table')
    .getByRole('button', { name: 'Actions for INV-2026-014' })
    .click()

  const item = page.getByRole('menuitem', { name: 'Mark as paid' })
  await item.focus()
  await expect(page.getByRole('menu')).toBeVisible()

  await settle(page)
  await expectNoHorizontalOverflow(page)
  await expect(page).toHaveScreenshot('list-menu.png', { fullPage: true })
})
