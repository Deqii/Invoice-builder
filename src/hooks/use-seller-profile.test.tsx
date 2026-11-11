import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '@/lib/storage'
import { useSellerProfile } from './use-seller-profile'

const profile = {
  businessName: 'Rama Studio',
  email: 'hello@ramastudio.example',
  address: 'Bandung, Indonesia',
}

beforeEach(() => {
  localStorage.clear()
})

describe('useSellerProfile', () => {
  it('reads the stored profile on mount', async () => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))

    const { result } = renderHook(() => useSellerProfile())

    await waitFor(() => expect(result.current.profile).toEqual(profile))
    expect(result.current.error).toBeNull()
  })

  it('sets the error and keeps the profile null when the stored profile is corrupt', async () => {
    localStorage.setItem(STORAGE_KEYS.profile, '{not json')

    const { result } = renderHook(() => useSellerProfile())

    await waitFor(() => expect(result.current.error).toBe('The stored seller profile is corrupt.'))
    expect(result.current.profile).toBeNull()
  })

  it('reloads the profile on demand', async () => {
    const { result } = renderHook(() => useSellerProfile())
    await waitFor(() => expect(result.current.profile).toBeNull())

    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
    act(() => result.current.reload())

    await waitFor(() => expect(result.current.profile).toEqual(profile))
  })
})
