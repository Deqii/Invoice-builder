import type { Page, TestInfo } from '@playwright/test'
import { seedStorage } from '../fixtures/seed'

export async function seed(page: Page) {
  const entries = seedStorage()
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('__seeded')) return
    sessionStorage.setItem('__seeded', '1')
    localStorage.clear()
    for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value)
  }, entries)
}

export async function freezeClock(page: Page) {
  await page.clock.setFixedTime(new Date(2026, 9, 26, 12, 0, 0))
}

export function shotPath(testInfo: TestInfo, name: string) {
  return `.superpowers/shots/${name}-${testInfo.project.name}.png`
}
