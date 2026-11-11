import { useCallback, useRef, useState } from 'react'
import { isProfileComplete } from '@/lib/profile'
import type { SellerProfile } from '@/lib/types'

export interface ProfileGate {
  run: (action: () => void) => void
  complete: () => void
  cancel: () => void
  pending: boolean
}

export function useProfileGate(profile: SellerProfile | null): ProfileGate {
  const pendingAction = useRef<(() => void) | null>(null)
  const [pending, setPending] = useState(false)

  const run = useCallback(
    (action: () => void) => {
      if (isProfileComplete(profile)) {
        action()
        return
      }
      pendingAction.current = action
      setPending(true)
    },
    [profile],
  )

  const complete = useCallback(() => {
    const action = pendingAction.current
    pendingAction.current = null
    setPending(false)
    action?.()
  }, [])

  const cancel = useCallback(() => {
    pendingAction.current = null
    setPending(false)
  }, [])

  return { run, complete, cancel, pending }
}
