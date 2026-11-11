const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

interface DateParts {
  year: number
  month: number
  day: number
}

function parseISO(value: string): DateParts | null {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return { year, month, day }
}

function toISO(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDate(parts: DateParts): Date {
  return new Date(parts.year, parts.month - 1, parts.day)
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now)
}

export function isValidISODate(value: string): boolean {
  return parseISO(value) !== null
}

export function addDaysISO(iso: string, days: number): string {
  const parts = parseISO(iso)
  if (!parts) return iso
  return toISO(new Date(parts.year, parts.month - 1, parts.day + days))
}

export function netDays(issued: string, due: string): number {
  const issuedParts = parseISO(issued)
  const dueParts = parseISO(due)
  if (!issuedParts || !dueParts) return 0
  const diff = localDate(dueParts).getTime() - localDate(issuedParts).getTime()
  return Math.round(diff / 86400000)
}

export function formatDate(iso: string): string {
  const parts = parseISO(iso)
  if (!parts) return iso
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(localDate(parts))
}

export function isBefore(a: string, b: string): boolean {
  return isValidISODate(a) && isValidISODate(b) && a < b
}
