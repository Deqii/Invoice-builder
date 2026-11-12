import { initials } from '@/lib/profile'

export function SellerAvatar({ businessName }: { businessName: string }) {
  return (
    <span
      aria-label="Seller profile"
      className="grid size-8 place-items-center rounded-full bg-line text-label leading-5 tracking-normal text-ink-muted"
    >
      {initials(businessName)}
    </span>
  )
}
