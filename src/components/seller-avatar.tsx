import { initials } from '@/lib/profile'

export function SellerAvatar({ businessName }: { businessName: string }) {
  return (
    <span
      aria-label="Seller profile"
      className="grid size-8 place-items-center rounded-full bg-line text-caption text-ink-muted"
    >
      {initials(businessName)}
    </span>
  )
}
