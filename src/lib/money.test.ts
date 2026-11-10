import { describe, expect, it } from 'vitest'
import {
  computeTotals,
  formatPercent,
  formatQty,
  formatRateInput,
  formatUsd,
  halfUpDiv,
  lineAmountMinor,
  parseMoneyInput,
  parsePercentInput,
  parseQtyInput,
} from './money'

describe('money engine', () => {
  it('computes the worked example with integer cents and rounding at each step', () => {
    const result = computeTotals(
      [
        { qtyHundredths: 100, rateMinor: 120000 },
        { qtyHundredths: 2400, rateMinor: 4500 },
        { qtyHundredths: 600, rateMinor: 4500 },
        { qtyHundredths: 100, rateMinor: 15000 },
      ],
      1000,
      1000,
    )

    expect(result.lines).toEqual([120000, 108000, 27000, 15000])
    expect(result.subtotalMinor).toBe(270000)
    expect(result.discountMinor).toBe(27000)
    expect(result.taxableMinor).toBe(243000)
    expect(result.taxMinor).toBe(24300)
    expect(result.totalMinor).toBe(267300)
    expect(formatUsd(result.totalMinor)).toBe('$2,673.00')
  })

  it('rounds half up at the edge cases', () => {
    expect(computeTotals([{ qtyHundredths: 100, rateMinor: 5 }], 1000, 0).discountMinor).toBe(1)
    expect(computeTotals([{ qtyHundredths: 100, rateMinor: 333 }], 0, 1500).taxMinor).toBe(50)
    expect(lineAmountMinor(50, 101)).toBe(51) // qty 0.5 x 101 cents -> 51
    expect(halfUpDiv(5000, 10000)).toBe(1)
  })

  it('computes the seed totals with one item and no discount or tax', () => {
    for (const amount of [48000, 135000, 92550, 198000]) {
      const result = computeTotals(
        [{ qtyHundredths: 100, rateMinor: amount }],
        0,
        0,
      )
      expect(result.lines).toEqual([amount])
      expect(result.subtotalMinor).toBe(amount)
      expect(result.discountMinor).toBe(0)
      expect(result.taxableMinor).toBe(amount)
      expect(result.taxMinor).toBe(0)
      expect(result.totalMinor).toBe(amount)
    }
  })

  it('formats USD, rate inputs, percentages and quantities without floats', () => {
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(267300)).toBe('$2,673.00')
    expect(formatRateInput(120000)).toBe('1,200.00')
    expect(formatRateInput(4500)).toBe('45.00')
    expect(formatPercent(1000)).toBe('10')
    expect(formatPercent(1050)).toBe('10.5')
    expect(formatQty(100)).toBe('1')
    expect(formatQty(50)).toBe('0.5')
  })

  it('parses exact input and rejects invalid values', () => {
    expect(parseMoneyInput('1,200.00')).toBe(120000)
    expect(parseMoneyInput('1,000')).toBe(100000)
    expect(parseMoneyInput('1,000.5')).toBe(100050)
    expect(parseMoneyInput('999,999,999.99')).toBe(99999999999)
    expect(parseMoneyInput('12,50')).toBeNull()
    expect(parseMoneyInput('1,50')).toBeNull()
    expect(parseMoneyInput('1,2,3')).toBeNull()
    expect(parseMoneyInput(',5')).toBeNull()
    expect(parseMoneyInput('1000,000')).toBeNull()
    expect(parseMoneyInput('0,500')).toBeNull()
    expect(parseMoneyInput('45')).toBe(4500)
    expect(parseMoneyInput('0.05')).toBe(5)
    expect(parseMoneyInput('1.234')).toBeNull()
    expect(parseMoneyInput('-1')).toBeNull()
    expect(parseMoneyInput('')).toBeNull()
    expect(parseQtyInput('0.5')).toBe(50)
    expect(parseQtyInput('0')).toBeNull()
    expect(parseQtyInput('1.001')).toBeNull()
    expect(parsePercentInput('10')).toBe(1000)
    expect(parsePercentInput('10.5')).toBe(1050)
    expect(parsePercentInput('100.01')).toBeNull()
    expect(parsePercentInput('abc')).toBeNull()
  })
})
