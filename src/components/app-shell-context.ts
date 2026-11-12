import { createContext, useContext } from 'react'
import type { SellerProfile } from '@/lib/types'

export interface AppShellContextValue {
  profile: SellerProfile | null
  openProfile: () => void
  runWithProfile: (action: () => void) => void
}

export const AppShellContext = createContext<AppShellContextValue | null>(null)

export function useAppShell(): AppShellContextValue {
  const context = useContext(AppShellContext)
  if (!context) throw new Error('useAppShell must be used inside AppShell')
  return context
}
