import { Link } from '@/components/link'

export function NotFound() {
  return (
    <main className="mx-auto w-full max-w-list px-4 pt-5 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
      <Link href="/" className="text-meta text-ink-muted hover:text-ink">
        ← Back to invoices
      </Link>
      <h1 data-testid="route-not-found" className="mt-1 text-page-title">
        Page not found
      </h1>
      <p className="mt-2 text-body text-ink-muted">The page you are looking for does not exist.</p>
    </main>
  )
}
