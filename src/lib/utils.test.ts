import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('keeps a custom font size and a text color', () => {
    expect(cn('text-body text-ink-muted')).toBe('text-body text-ink-muted')
  })

  it('keeps a default font size and a text color', () => {
    expect(cn('text-sm text-ink-muted')).toBe('text-sm text-ink-muted')
  })

  it('keeps only the later font size', () => {
    expect(cn('text-body text-caption')).toBe('text-caption')
  })

  it('keeps only the later text color', () => {
    expect(cn('text-ink text-danger')).toBe('text-danger')
  })
})
