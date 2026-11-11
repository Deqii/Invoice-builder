import { initials } from '@/lib/profile'

export function LogoMark({
  businessName,
  size = 'md',
}: {
  businessName: string
  size?: 'sm' | 'md'
}) {
  const dimension = size === 'sm' ? 'size-8' : 'size-10'
  return (
    <span
      className={`grid ${dimension} shrink-0 place-items-center rounded-lg bg-brand text-body-strong font-bold text-on-brand`}
    >
      {initials(businessName)}
    </span>
  )
}
