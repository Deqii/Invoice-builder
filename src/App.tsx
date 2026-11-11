import { useState } from 'react'
import { ProfileDialog } from '@/components/profile-dialog'
import { SellerAvatar } from '@/components/seller-avatar'
import { Button } from '@/components/ui/button'
import { useSellerProfile } from '@/hooks/use-seller-profile'

function App() {
  const { profile, reload } = useSellerProfile()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="grid h-16 grid-cols-3 items-center border-b border-line bg-paper px-4 sm:px-8">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-brand text-body-strong text-on-brand">
            I
          </span>
          <span className="text-app-name">Invoice Builder</span>
        </div>

        <nav aria-label="Main" className="hidden justify-center gap-1 sm:flex">
          <span
            aria-current="page"
            className="rounded-lg bg-page px-3 py-2 text-body-medium text-ink"
          >
            Invoices
          </span>
          <span
            aria-disabled="true"
            className="px-3 py-2 text-body-medium text-ink-muted"
          >
            Clients
          </span>
          <span
            aria-disabled="true"
            className="px-3 py-2 text-body-medium text-ink-muted"
          >
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
            onClick={() => setProfileOpen(true)}
          >
            <SellerAvatar businessName={profile?.businessName ?? ''} />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-list px-4 pb-10 pt-5 sm:px-6 sm:pb-16 sm:pt-8" />

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onSaved={reload}
      />
    </div>
  )
}

export default App
