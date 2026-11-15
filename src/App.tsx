import { AppShell } from '@/components/app-shell'
import { InvoiceList } from '@/routes/invoice-list'
import { InvoiceEditor } from '@/routes/invoice-editor'
import { InvoicePreview } from '@/routes/invoice-preview'
import { NotFound } from '@/routes/not-found'
import { matchRoute, usePathname, type Route } from '@/lib/router'

function renderRoute(route: Route) {
  switch (route.name) {
    case 'list':
      return <InvoiceList />
    case 'new':
      return <InvoiceEditor key="new" />
    case 'edit':
      return <InvoiceEditor key={`edit-${route.id}`} id={route.id} />
    case 'preview':
      return <InvoicePreview key={route.id} id={route.id} />
    case 'unknown':
      return <NotFound />
  }
}

function App() {
  const pathname = usePathname()
  return <AppShell>{renderRoute(matchRoute(pathname))}</AppShell>
}

export default App
