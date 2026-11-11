import { describe, expect, it } from 'vitest'
import { initials, isProfileComplete, validateProfile } from './profile'
import type { SellerProfile } from './types'

const validProfile: SellerProfile = {
  businessName: 'Rama Studio',
  email: 'hello@ramastudio.example',
  address: 'Bandung, Indonesia',
}

describe('initials', () => {
  it('uses the first letter of the first two words', () => {
    expect(initials('Rama Studio')).toBe('RS')
    expect(initials('  rama   studio  ')).toBe('RS')
  })

  it('uses one letter for a single word', () => {
    expect(initials('Rama')).toBe('R')
  })

  it('falls back to IB for an empty name', () => {
    expect(initials('')).toBe('IB')
    expect(initials('   ')).toBe('IB')
  })

  it('skips words without letters or digits', () => {
    expect(initials('Birch & Co')).toBe('BC')
    expect(initials('(PT) Maju')).toBe('PM')
  })

  it('caps the result at two characters', () => {
    expect(Array.from(initials('ßeta Labs'))).toHaveLength(2)
  })

  it('never returns a lone surrogate', () => {
    const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
    expect(initials('🚀 Rocket')).not.toMatch(loneSurrogate)
  })
})

describe('isProfileComplete', () => {
  it('is false for a null profile', () => {
    expect(isProfileComplete(null)).toBe(false)
  })

  it('is false for any blank trimmed field', () => {
    expect(isProfileComplete({ ...validProfile, businessName: '   ' })).toBe(false)
    expect(isProfileComplete({ ...validProfile, email: '   ' })).toBe(false)
    expect(isProfileComplete({ ...validProfile, address: '   ' })).toBe(false)
  })

  it('is false for an invalid email', () => {
    expect(isProfileComplete({ ...validProfile, email: 'not-an-email' })).toBe(false)
  })

  it('is true for the seeded profile', () => {
    expect(isProfileComplete(validProfile)).toBe(true)
  })
})

describe('validateProfile', () => {
  it('returns the section 15 messages for missing fields', () => {
    expect(validateProfile({ businessName: ' ', email: ' ', address: ' ' })).toEqual({
      businessName: 'Enter your business name.',
      email: 'Enter a valid email address.',
      address: 'Enter your business address.',
    })
  })

  it('returns an email message for an invalid email', () => {
    expect(validateProfile({ ...validProfile, email: 'not-an-email' })).toEqual({
      email: 'Enter a valid email address.',
    })
  })

  it('returns no errors for a valid profile', () => {
    expect(validateProfile(validProfile)).toEqual({})
  })
})
