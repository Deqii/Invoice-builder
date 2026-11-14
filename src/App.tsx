import { AppShell } from '@/components/app-shell'
import { InvoiceList } from '@/routes/invoice-list'
import { InvoiceEditor } from '@/routes/invoice-editor'
import { NotFound } from '@/routes/not-found'
import { Link } from '@/components/link'
import { matchRoute, usePathname, type Route } from '@/lib/router'

function RoutePlaceholder({
  title,
  testId,
  note,
}: {
  title: string
  testId: string
  note: string
}) {
  return (
    <main className="mx-auto w-full max-w-editor px-4 pt-5 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
      <Link href="/" className="text-meta text-ink-muted hover:text-ink">
        ← Back to invoices
      </Link>
      <h1 data-testid={testId} className="mt-1 text-page-title">
        {title}
      </h1>
      <p className="mt-2 text-body text-ink-muted">{note}</p>
    </main>
  )
}

function renderRoute(route: Route) {
  switch (route.name) {
    case 'list':
      return <InvoiceList />
    case 'new':
      return <InvoiceEditor key="new" />
    case 'edit':
      return <InvoiceEditor key={`edit-${route.id}`} id={route.id} />
    case 'preview':
      return (
        <RoutePlaceholder
          title="Invoice preview"
          testId="route-preview"
          note="TODO: Task 8 replaces this placeholder with the invoice preview."
        />
      )
    case 'unknown':
      return <NotFound />
  }
}

function App() {
  const pathname = usePathname()
  return <AppShell>{renderRoute(matchRoute(pathname))}</AppShell>
}

export default App
