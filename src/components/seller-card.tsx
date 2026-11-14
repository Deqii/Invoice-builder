import { useAppShell } from '@/components/app-shell-context'
import { LogoMark } from '@/components/logo-mark'
import { isProfileComplete } from '@/lib/profile'

export function SellerCard() {
  const { profile, openProfile } = useAppShell()
  const complete = isProfileComplete(profile)

  return (
    <div
      data-testid="seller-card"
      className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-muted-bg p-4"
    >
      <LogoMark businessName={profile?.businessName ?? ''} />
      <div className="min-w-0 flex-1">
        {complete && profile ? (
          <>
            <p className="text-body-strong">{profile.businessName}</p>
            <p className="whitespace-pre-line text-body text-ink-muted">{profile.address}</p>
            <p className="text-body text-ink-muted">{profile.email}</p>
          </>
        ) : (
          <p className="text-body text-ink-muted">
            Add your business details before creating an invoice.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={openProfile}
        className="shrink-0 text-body-medium font-medium text-brand max-sm:ml-14 max-sm:basis-full max-sm:text-left"
      >
        Edit profile
      </button>
    </div>
  )
}
