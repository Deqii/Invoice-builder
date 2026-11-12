import { Badge } from '@/components/ui/badge'
import { statusLabel, type DisplayStatus } from '@/lib/status'

const STATUS_CLASSES: Record<DisplayStatus, string> = {
  draft: 'bg-draft-bg text-draft-ink',
  sent: 'bg-sent-bg text-sent-ink',
  paid: 'bg-paid-bg text-paid-ink',
  overdue: 'bg-overdue-bg text-overdue-ink',
}

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return <Badge className={`border-0 ${STATUS_CLASSES[status]}`}>{statusLabel(status)}</Badge>
}
