import { expect, test } from '@playwright/test'
import { freezeClock, seed } from '../visual/helpers'

test('makes no external requests and self-hosts Inter', async ({ page, baseURL }) => {
  if (!baseURL) throw new Error('baseURL is required')
  const appOrigin = new URL(baseURL).origin
  const external: string[] = []
  const fontResponses: string[] = []

  page.on('request', (request) => {
    const url = new URL(request.url())
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== appOrigin) {
      external.push(request.url())
    }
  })
  page.on('response', (response) => {
    if (response.request().resourceType() === 'font') {
      fontResponses.push(new URL(response.url()).origin)
    }
  })

  await seed(page)

  for (const path of ['/', '/invoices/inv-014', '/invoices/inv-014/edit', '/invoices/new']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
  }

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Seller profile' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  expect(external).toEqual([])
  expect(fontResponses.length).toBeGreaterThan(0)
  expect(fontResponses.filter((origin) => origin !== appOrigin)).toEqual([])

  const interLoaded = await page.evaluate(async () => {
    await document.fonts.ready
    return Array.from(document.fonts).some(
      (face) => face.family.replace(/["']/g, '') === 'Inter' && face.status === 'loaded',
    )
  })
  expect(interLoaded).toBe(true)

  const fontLinks = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('link')).filter((link) => {
        const href = link.getAttribute('href') ?? ''
        return href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')
      }).length,
  )
  expect(fontLinks).toBe(0)
})

async function fillInvoice(page: import('@playwright/test').Page) {
  await page.getByLabel('Client').fill('Acme')
  await page.getByLabel('Item 1 description').fill('Services')
  await page.getByLabel('Item 1 quantity').fill('1')
  await page.getByLabel('Item 1 rate').fill('100')
  await page.getByRole('button', { name: 'Save invoice' }).click()
}

test('persists the profile and invoices across reload', async ({ page }) => {
  await freezeClock(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'New invoice' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Seller profile' })).toBeVisible()
  await dialog.getByLabel('Business name').fill('Rama Studio')
  await dialog.getByLabel('Email').fill('hello@ramastudio.example')
  await dialog.getByLabel('Address').fill('Bandung, Indonesia')
  await dialog.getByRole('button', { name: 'Save profile' }).click()

  await expect(page).toHaveURL(/\/invoices\/new$/)
  await fillInvoice(page)
  await expect(page).toHaveURL(/\/invoices\/[^/]+$/)
  await expect(page.getByRole('heading', { level: 1, name: /INV-2026-001/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: /INV-2026-001/ })).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'INV-2026-001' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Seller profile' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'INV-2026-001' })).toBeVisible()

  await page.getByRole('button', { name: 'New invoice' }).click()
  await expect(page).toHaveURL(/\/invoices\/new$/)
  await fillInvoice(page)
  await expect(page.getByRole('heading', { level: 1, name: /INV-2026-002/ })).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'INV-2026-001' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'INV-2026-002' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'INV-2026-001' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'INV-2026-002' })).toBeVisible()
})
