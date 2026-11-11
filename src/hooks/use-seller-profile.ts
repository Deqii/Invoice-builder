import { useCallback, useState } from 'react'
import { readProfile, StorageFailure } from '@/lib/storage'
import type { SellerProfile } from '@/lib/types'

export interface UseSellerProfileResult {
  profile: SellerProfile | null
  error: string | null
  reload: () => void
}

interface ProfileState {
  profile: SellerProfile | null
  error: string | null
}

function readProfileState(): ProfileState {
  try {
    return { profile: readProfile(), error: null }
  } catch (failure) {
    return {
      profile: null,
      error:
        failure instanceof StorageFailure
          ? failure.message
          : 'Could not read the seller profile.',
    }
  }
}

export function useSellerProfile(): UseSellerProfileResult {
  const [state, setState] = useState<ProfileState>(readProfileState)
  const reload = useCallback(() => setState(readProfileState()), [])

  return { profile: state.profile, error: state.error, reload }
}
