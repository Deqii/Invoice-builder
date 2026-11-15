import { expect, test } from '@playwright/test'
import { inflateSync } from 'node:zlib'
import { freezeClock, seed } from '../visual/helpers'

interface CounterWindow extends Window {
  __printCalls: number
}

async function stubPrint(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    ;(window as unknown as CounterWindow).__printCalls = 0
    window.print = () => {
      ;(window as unknown as CounterWindow).__printCalls += 1
    }
  })
}

async function openPreview(page: import('@playwright/test').Page) {
  await seed(page)
  await freezeClock(page)
  await page.goto('/invoices/inv-014')
  await expect(page.getByTestId('route-preview')).toBeVisible()
}

async function printCalls(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => (window as unknown as CounterWindow).__printCalls)
}

test.describe('print buttons', () => {
  test('both buttons call window.print once', async ({ page }) => {
    await stubPrint(page)
    await openPreview(page)

    await page.getByRole('button', { name: 'Print' }).click()
    expect(await printCalls(page)).toBe(1)

    await page.getByRole('button', { name: 'Download PDF' }).click()
    expect(await printCalls(page)).toBe(2)
  })
})

test.describe('print media', () => {
  test('hides chrome and prints only the paper at A4 width', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'fixed A4 viewport')
    await openPreview(page)

    await page.setViewportSize({ width: 794, height: 1123 })
    await page.emulateMedia({ media: 'print' })

    await expect(page.locator('header')).toBeHidden()
    await expect(page.getByRole('link', { name: '← Back to invoices' })).toBeHidden()
    await expect(page.getByTestId('route-preview')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Print' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeHidden()
    await expect(page.getByRole('link', { name: 'Edit' })).toBeHidden()

    const paper = page.getByTestId('invoice-paper')
    const styles = await paper.evaluate((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return {
        borderTop: style.borderTopWidth,
        borderRight: style.borderRightWidth,
        borderBottom: style.borderBottomWidth,
        borderLeft: style.borderLeftWidth,
        radius: style.borderTopLeftRadius,
        shadow: style.boxShadow,
        background: style.backgroundColor,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        top: rect.top,
        left: rect.left,
        width: rect.width,
      }
    })

    expect(styles).toMatchObject({
      borderTop: '0px',
      borderRight: '0px',
      borderBottom: '0px',
      borderLeft: '0px',
      radius: '0px',
      background: 'rgb(255, 255, 255)',
      paddingTop: '0px',
      paddingBottom: '0px',
      paddingLeft: '48px',
      top: 0,
      left: 0,
      width: 794,
    })
    const shadows = styles.shadow === 'none' ? [] : styles.shadow.split(/,(?![^()]*\))/)
    expect(shadows.filter((shadow) => !/^rgba\(0, 0, 0, 0\)/.test(shadow.trim()))).toEqual([])

    const rowBreak = await page.locator('table tbody tr').first().evaluate((element) => {
      const style = getComputedStyle(element)
      return style.breakInside || style.getPropertyValue('break-inside')
    })
    expect(rowBreak).toBe('avoid')

    const badge = await page.getByTestId('invoice-paper').getByText('Sent').count()
    expect(badge).toBe(0)

    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(background).toBe('rgb(255, 255, 255)')
  })
})

function longInvoice() {
  return {
    id: 'long',
    number: 'INV-2026-099',
    status: 'sent',
    issuedDate: '2026-10-20',
    dueDate: '2026-11-03',
    billedTo: 'Long Client\nOne Long Street',
    paymentMethod: 'Bank transfer',
    items: Array.from({ length: 45 }, (_, index) => ({
      id: `long-item-${index + 1}`,
      description: `Line item ${index + 1}`,
      qtyHundredths: 100,
      rateMinor: 1000,
    })),
    discountPercent: 0,
    taxPercent: 0,
    notes: 'A long invoice that must span more than one printed page.',
    createdAt: '2026-10-20T08:00:00.000Z',
    updatedAt: '2026-10-20T08:00:00.000Z',
  }
}

interface PdfTextPage {
  maxY: number
  count: number
}

function pdfObjects(buffer: Buffer): Map<number, string> {
  const text = buffer.toString('latin1')
  const objects = new Map<number, string>()
  const pattern = /(\d+) 0 obj\r?\n([\s\S]*?)endobj/g
  for (const match of text.matchAll(pattern)) {
    objects.set(Number(match[1]), match[2])
  }
  return objects
}

function pageRefs(objects: Map<number, string>): number[] {
  for (const body of objects.values()) {
    if (!/\/Type\s*\/Pages\b/.test(body)) continue
    const kids = /\/Kids\s*\[([^\]]*)\]/.exec(body)
    if (!kids) continue
    return Array.from(kids[1].matchAll(/(\d+) 0 R/g)).map((match) => Number(match[1]))
  }
  return []
}

function contentRefs(body: string): number[] {
  const single = /\/Contents\s+(\d+) 0 R/.exec(body)
  if (single) return [Number(single[1])]
  const many = /\/Contents\s*\[([^\]]*)\]/.exec(body)
  if (many) {
    return Array.from(many[1].matchAll(/(\d+) 0 R/g)).map((match) => Number(match[1]))
  }
  return []
}

function decodeStream(body: string): string {
  const start = body.indexOf('stream')
  const end = body.indexOf('endstream')
  if (start < 0 || end < 0) return ''
  let raw = body.slice(start + 6, end)
  raw = raw.replace(/^\r?\n/, '').replace(/\r?\n$/, '')
  const bytes = Buffer.from(raw, 'latin1')
  if (/\/Filter\s*\/FlateDecode/.test(body)) {
    try {
      return inflateSync(bytes).toString('latin1')
    } catch {
      return bytes.toString('latin1')
    }
  }
  return bytes.toString('latin1')
}

function compose(outer: number[], inner: number[]): number[] {
  const [a1, b1, c1, d1, e1, f1] = outer
  const [a2, b2, c2, d2, e2, f2] = inner
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ]
}

const NUMBER = String.raw`-?(?:\d+(?:\.\d*)?|\.\d+)`
const CM = new RegExp(`^(${NUMBER}) (${NUMBER}) (${NUMBER}) (${NUMBER}) (${NUMBER}) (${NUMBER}) cm$`)
const TM = new RegExp(`^(${NUMBER}) (${NUMBER}) (${NUMBER}) (${NUMBER}) (${NUMBER}) (${NUMBER}) Tm$`)

function readPageTextY(buffer: Buffer): PdfTextPage[] {
  const objects = pdfObjects(buffer)
  const refs = pageRefs(objects)
  return refs.map((ref) => {
    const body = objects.get(ref) ?? ''
    const streams = contentRefs(body)
      .map((contentRef) => decodeStream(objects.get(contentRef) ?? ''))
      .join('\n')
    let ctm = [1, 0, 0, 1, 0, 0]
    const stack: number[][] = []
    let maxY = 0
    let count = 0
    for (const line of streams.split('\n')) {
      const operator = line.trim()
      if (operator === 'q') {
        stack.push([...ctm])
        continue
      }
      if (operator === 'Q') {
        ctm = stack.pop() ?? ctm
        continue
      }
      const cm = CM.exec(operator)
      if (cm) {
        ctm = compose(ctm, cm.slice(1).map(Number))
        continue
      }
      const tm = TM.exec(operator)
      if (tm) {
        const [, , , , e, f] = tm.slice(1).map(Number)
        const y = ctm[1] * e + ctm[3] * f + ctm[5]
        maxY = Math.max(maxY, y)
        count += 1
      }
    }
    return { maxY, count }
  })
}

test.describe('multi page print', () => {
  test('A4 page rule, more than one page and a 36pt top margin on page two', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'chromium pdf, fixed viewport')

    await openPreview(page)
    await page.evaluate((invoice) => {
      localStorage.setItem('invoice-builder:v1:invoice:long', JSON.stringify(invoice))
    }, longInvoice())
    await page.goto('/invoices/long')
    await expect(page.getByText('Line item 45')).toBeVisible()

    const rules = await page.evaluate(() => {
      const found: Array<{ cssText: string; size: string; margin: string }> = []
      function walk(rules: CSSRuleList) {
        for (const rule of Array.from(rules)) {
          if (rule.constructor.name === 'CSSPageRule') {
            const style = (rule as CSSPageRule).style
            found.push({ cssText: rule.cssText, size: style.size, margin: style.margin })
          }
          const nested = (rule as CSSMediaRule).cssRules
          if (nested) walk(nested)
        }
      }
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          walk(sheet.cssRules)
        } catch {
          // cross origin sheets are not used by the app
        }
      }
      return found
    })

    const pageRule = rules.find((rule) => /a4/i.test(rule.size))
    expect(pageRule, JSON.stringify(rules)).toBeTruthy()
    expect(pageRule?.cssText).toMatch(/A4/i)
    expect(pageRule?.margin.replace(/\s+/g, ' ').trim()).toMatch(/^48px 0(px)?$/)

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
    const text = pdf.toString('latin1')
    const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length
    expect(pageCount).toBeGreaterThan(1)

    const pages = readPageTextY(pdf)
    expect(pages.length).toBeGreaterThan(1)
    expect(pages[1].count).toBeGreaterThan(0)

    const mediaBox = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(text)
    const pageWidth = Number(mediaBox?.[1] ?? 0)
    const pageHeight = Number(mediaBox?.[2] ?? 0)
    expect(pageHeight).toBeGreaterThan(pageWidth)

    const marginPoints = 48 * (72 / 96)
    const maxY = pages[1].maxY
    expect(
      maxY,
      `second page topmost text baseline ${maxY.toFixed(2)}pt, page height ${pageHeight.toFixed(2)}pt, limit ${(pageHeight - marginPoints).toFixed(2)}pt`,
    ).toBeLessThanOrEqual(pageHeight - marginPoints)
  })
})

test.describe('overflow', () => {
  test('seeded preview has no horizontal scroll at 390, 360 and 320', async ({ page }) => {
    await openPreview(page)

    for (const width of [390, 360, 320]) {
      await page.setViewportSize({ width, height: 844 })
      const sizes = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(sizes.scrollWidth, `preview at ${width}px`).toBeLessThanOrEqual(sizes.innerWidth)
    }
  })

  test('empty notes preview has no horizontal scroll at 390, 360 and 320', async ({ page }) => {
    await seed(page)
    await freezeClock(page)
    await page.goto('/invoices/inv-015')
    await expect(page.getByTestId('route-preview')).toBeVisible()

    for (const width of [390, 360, 320]) {
      await page.setViewportSize({ width, height: 844 })
      const sizes = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(sizes.scrollWidth, `empty notes preview at ${width}px`).toBeLessThanOrEqual(
        sizes.innerWidth,
      )
    }
  })
})

test.describe('preview dates under America/Los_Angeles', () => {
  test.use({ timezoneId: 'America/Los_Angeles' })

  test('shows Oct 20, Nov 3 and Net 14 days', async ({ page }) => {
    await openPreview(page)

    await expect(page.getByText('Oct 20, 2026')).toBeVisible()
    await expect(page.getByText('Nov 3, 2026')).toBeVisible()
    await expect(page.getByText(/Net 14 days/)).toBeVisible()
  })
})

test.describe('preview dates under Pacific/Kiritimati', () => {
  test.use({ timezoneId: 'Pacific/Kiritimati' })

  test('shows Oct 20, Nov 3 and Net 14 days', async ({ page }) => {
    await openPreview(page)

    await expect(page.getByText('Oct 20, 2026')).toBeVisible()
    await expect(page.getByText('Nov 3, 2026')).toBeVisible()
    await expect(page.getByText(/Net 14 days/)).toBeVisible()
  })
})

test.describe('preview layout', () => {
  test('notes section is 520px on desktop and full content width on mobile', async ({ page }) => {
    await openPreview(page)

    await page.setViewportSize({ width: 1440, height: 900 })
    const desktop = await page.evaluate(() => {
      const paper = document.querySelector('[data-testid="invoice-paper"]') as HTMLElement
      const heading = Array.from(paper.querySelectorAll('h3')).find(
        (element) => element.textContent?.trim() === 'Notes',
      ) as HTMLElement
      const section = heading.parentElement as HTMLElement
      return { notes: section.getBoundingClientRect().width }
    })
    expect(desktop.notes).toBe(520)

    await page.setViewportSize({ width: 390, height: 844 })
    const mobile = await page.evaluate(() => {
      const paper = document.querySelector('[data-testid="invoice-paper"]') as HTMLElement
      const heading = Array.from(paper.querySelectorAll('h3')).find(
        (element) => element.textContent?.trim() === 'Notes',
      ) as HTMLElement
      const section = heading.parentElement as HTMLElement
      const table = paper.querySelector('table') as HTMLElement
      return {
        notes: section.getBoundingClientRect().width,
        table: table.getBoundingClientRect().width,
      }
    })
    expect(mobile.notes).toBe(mobile.table)
  })
})
