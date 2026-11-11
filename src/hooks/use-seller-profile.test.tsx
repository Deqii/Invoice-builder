import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, memo } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProfileDialog } from '@/components/profile-dialog'
import { STORAGE_KEYS } from '@/lib/storage'
import { useSellerProfile } from './use-seller-profile'

const profile = {
  businessName: 'Rama Studio',
  email: 'hello@ramastudio.example',
  address: 'Bandung, Indonesia',
}

const Consumer = memo(function Consumer({ label }: { label: string }) {
  const { profile: current } = useSellerProfile()
  return <p>{`${label}:${current?.businessName ?? 'none'}`}</p>
})

function SharedHarness() {
  const { profile: current, reload } = useSellerProfile()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Consumer label="other" />
      <button type="button" onClick={() => setOpen(true)}>
        Open profile
      </button>
      <ProfileDialog
        open={open}
        onOpenChange={setOpen}
        profile={current}
        onSaved={reload}
      />
    </>
  )
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

  it('updates every mounted consumer when the dialog saves', async () => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
    const user = userEvent.setup()
    render(<SharedHarness />)

    await screen.findByText('other:Rama Studio')

    await user.click(screen.getByRole('button', { name: 'Open profile' }))
    const businessName = screen.getByLabelText('Business name')
    await user.clear(businessName)
    await user.type(businessName, 'Nusa Creative')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await screen.findByText('other:Nusa Creative')
    expect(screen.queryByText('other:Rama Studio')).not.toBeInTheDocument()
  })

  it('does not leak a saved profile into a later mount', async () => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
    const first = renderHook(() => useSellerProfile())
    await waitFor(() => expect(first.result.current.profile).toEqual(profile))
    first.unmount()

    localStorage.clear()
    const second = renderHook(() => useSellerProfile())

    await waitFor(() => expect(second.result.current.profile).toBeNull())
  })
})
