import { useSyncExternalStore } from 'react'
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

let snapshot: ProfileState = readProfileState()
const listeners = new Set<() => void>()

function getSnapshot(): ProfileState {
  return snapshot
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) snapshot = readProfileState()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function reload() {
  snapshot = readProfileState()
  for (const listener of listeners) listener()
}

export function useSellerProfile(): UseSellerProfileResult {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { profile: state.profile, error: state.error, reload }
}
