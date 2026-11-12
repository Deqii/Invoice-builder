import { useState, type ReactNode } from 'react'
import { ProfileDialog } from '@/components/profile-dialog'
import { SellerAvatar } from '@/components/seller-avatar'
import { Button } from '@/components/ui/button'
import { useProfileGate } from '@/hooks/use-profile-gate'
import { useSellerProfile } from '@/hooks/use-seller-profile'
import { AppShellContext } from '@/components/app-shell-context'

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, reload } = useSellerProfile()
  const gate = useProfileGate(profile)
  const [avatarOpen, setAvatarOpen] = useState(false)

  const dialogOpen = avatarOpen || gate.pending
  const gateOpened = gate.pending && !avatarOpen

  function handleOpenChange(open: boolean) {
    if (open) {
      setAvatarOpen(true)
      return
    }
    setAvatarOpen(false)
    if (gate.pending) gate.cancel()
  }

  function handleSaved() {
    reload()
    gate.complete()
  }

  return (
    <AppShellContext.Provider
      value={{ profile, openProfile: () => setAvatarOpen(true), runWithProfile: gate.run }}
    >
      <div className="min-h-screen bg-page text-ink">
        <header className="flex h-16 items-center justify-between border-b border-line bg-paper px-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-brand text-body-strong leading-6 font-bold text-on-brand">
              I
            </span>
            <span className="text-app-name">Invoice Builder</span>
          </div>

          <nav aria-label="Main" className="hidden justify-center gap-1 sm:flex">
            <span aria-current="page" className="rounded-md bg-page px-3 py-2 text-body-medium text-ink">
              Invoices
            </span>
            <span aria-disabled="true" className="rounded-md px-3 py-2 text-body-medium text-ink-muted">
              Clients
            </span>
            <span aria-disabled="true" className="rounded-md px-3 py-2 text-body-medium text-ink-muted">
              Settings
            </span>
          </nav>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Seller profile"
              className="rounded-full p-0"
              onClick={() => setAvatarOpen(true)}
            >
              <SellerAvatar businessName={profile?.businessName ?? ''} />
            </Button>
          </div>
        </header>

        {children}

        <ProfileDialog
          open={dialogOpen}
          onOpenChange={handleOpenChange}
          profile={profile}
          onSaved={handleSaved}
          helperText={
            gateOpened ? 'Add your business details before creating an invoice.' : undefined
          }
        />
      </div>
    </AppShellContext.Provider>
  )
}
