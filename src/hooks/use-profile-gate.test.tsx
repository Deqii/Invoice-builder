import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useProfileGate } from './use-profile-gate'
import type { SellerProfile } from '@/lib/types'

const completeProfile: SellerProfile = {
  businessName: 'Rama Studio',
  email: 'hello@ramastudio.example',
  address: 'Bandung, Indonesia',
}

const incompleteProfile: SellerProfile = { ...completeProfile, address: ' ' }

describe('useProfileGate', () => {
  it('runs the action immediately with a complete profile and never sets pending', () => {
    const { result } = renderHook(() => useProfileGate(completeProfile))
    const action = vi.fn()

    act(() => result.current.run(action))

    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.pending).toBe(false)
  })

  it('defers the action with an incomplete profile and runs it once on complete', () => {
    const { result } = renderHook(() => useProfileGate(incompleteProfile))
    const action = vi.fn()

    act(() => result.current.run(action))
    expect(action).not.toHaveBeenCalled()
    expect(result.current.pending).toBe(true)

    act(() => result.current.complete())
    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.pending).toBe(false)

    act(() => result.current.complete())
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('drops the action on cancel, including a cancel after complete', () => {
    const { result } = renderHook(() => useProfileGate(incompleteProfile))
    const action = vi.fn()

    act(() => result.current.run(action))
    act(() => result.current.cancel())
    expect(action).not.toHaveBeenCalled()
    expect(result.current.pending).toBe(false)

    act(() => result.current.run(action))
    act(() => result.current.complete())
    act(() => result.current.cancel())
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('keeps the last action when run is called twice', () => {
    const { result } = renderHook(() => useProfileGate(incompleteProfile))
    const first = vi.fn()
    const second = vi.fn()

    act(() => result.current.run(first))
    act(() => result.current.run(second))
    act(() => result.current.complete())

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
