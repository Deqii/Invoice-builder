import { expect, type Page, type TestInfo } from '@playwright/test'
import { sellerProfile, seedStorage } from '../fixtures/seed'
import { STORAGE_KEYS } from '../../src/lib/storage'

export async function seed(page: Page) {
  const entries = seedStorage()
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('__seeded')) return
    sessionStorage.setItem('__seeded', '1')
    localStorage.clear()
    for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value)
  }, entries)
}

export async function seedProfileOnly(page: Page) {
  await page.addInitScript((profile) => {
    if (sessionStorage.getItem('__seeded')) return
    sessionStorage.setItem('__seeded', '1')
    localStorage.clear()
    localStorage.setItem(profile.key, profile.value)
  }, { key: STORAGE_KEYS.profile, value: JSON.stringify(sellerProfile) })
}

export async function seedEmpty(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__seeded')) return
    sessionStorage.setItem('__seeded', '1')
    localStorage.clear()
  })
}

export async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.innerWidth)
}

export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
}

export async function freezeClock(page: Page) {
  const localNoon = await page.evaluate(() => new Date(2026, 9, 26, 12, 0, 0).getTime())
  await page.clock.setFixedTime(localNoon)
}

export function shotPath(testInfo: TestInfo, name: string) {
  return `.superpowers/shots/${name}-${testInfo.project.name}.png`
}
