/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  formatDate,
  isBefore,
  isValidISODate,
  netDays,
  todayISO,
} from './dates'

const tz = process.env.TZ
const expectedOffset = tz === 'Asia/Jakarta' ? -420 : tz === 'America/Los_Angeles' ? 420 : null

describe('local calendar dates', () => {
  it.skipIf(expectedOffset === null)('runs in the requested time zone', () => {
    expect(new Date(2026, 9, 26).getTimezoneOffset()).toBe(expectedOffset)
  })

  it('todayISO uses the local calendar date at both ends of the day', () => {
    expect(todayISO(new Date(2026, 9, 26, 0, 30))).toBe('2026-10-26')
    expect(todayISO(new Date(2026, 9, 26, 23, 30))).toBe('2026-10-26')
  })

  it('round-trips a stored YYYY-MM-DD without a UTC shift', () => {
    expect(addDaysISO('2026-10-26', 0)).toBe('2026-10-26')
    expect(addDaysISO('2026-12-31', 0)).toBe('2026-12-31')
  })

  it('adds days across month and year boundaries', () => {
    expect(addDaysISO('2026-10-26', 14)).toBe('2026-11-09')
    expect(addDaysISO('2026-12-25', 10)).toBe('2027-01-04')
    expect(addDaysISO('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDaysISO('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('builds the default due date from a late local evening', () => {
    expect(addDaysISO(todayISO(new Date(2026, 9, 26, 23, 30)), 14)).toBe('2026-11-09')
  })

  it('netDays is a whole-day difference across daylight saving changes', () => {
    expect(netDays('2026-10-20', '2026-11-03')).toBe(14)
    expect(netDays('2026-10-26', '2026-11-09')).toBe(14)
    expect(netDays('2027-03-01', '2027-03-15')).toBe(14)
    expect(netDays('2026-10-20', '2026-10-20')).toBe(0)
  })

  it('adds days correctly across a daylight saving start', () => {
    expect(addDaysISO('2027-03-01', 14)).toBe('2027-03-15')
  })

  it('formats a local date in en-US short style', () => {
    expect(formatDate('2026-09-02')).toBe('Sep 2, 2026')
    expect(formatDate('2026-10-20')).toBe('Oct 20, 2026')
  })

  it('validates calendar dates', () => {
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('20-10-2026')).toBe(false)
    expect(isValidISODate('2028-02-29')).toBe(true)
    expect(isValidISODate('2027-02-29')).toBe(false)
    expect(isValidISODate('0026-10-20')).toBe(false)
  })

  it('compares ISO dates', () => {
    expect(isBefore('2026-09-29', '2026-10-26')).toBe(true)
    expect(isBefore('2026-10-26', '2026-10-26')).toBe(false)
  })
})
