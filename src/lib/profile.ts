import type { SellerProfile } from './types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

export function initials(businessName: string): string {
  const words = businessName.split(/\s+/).filter((word) => LETTER_OR_DIGIT.test(word))
  const letters = words.slice(0, 2).map((word) => {
    const first = Array.from(word).find((char) => LETTER_OR_DIGIT.test(char)) ?? ''
    return first.toUpperCase()
  })
  const result = Array.from(letters.join('')).slice(0, 2).join('')
  return result === '' ? 'IB' : result
}

export function validateProfile(
  profile: SellerProfile,
): Partial<Record<'businessName' | 'email' | 'address', string>> {
  const errors: Partial<Record<'businessName' | 'email' | 'address', string>> = {}
  if (profile.businessName.trim() === '') errors.businessName = 'Enter your business name.'
  const email = profile.email.trim()
  if (email === '' || !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.'
  if (profile.address.trim() === '') errors.address = 'Enter your business address.'
  return errors
}

export function isProfileComplete(profile: SellerProfile | null): boolean {
  if (profile === null) return false
  return Object.keys(validateProfile(profile)).length === 0
}
