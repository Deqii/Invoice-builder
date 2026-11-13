import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { availableStatusAction } from '@/lib/status'
import type { Invoice, StoredStatus } from '@/lib/types'

type BusyAction = 'status' | 'duplicate' | 'delete'

export interface InvoiceActionsMenuProps {
  invoice: Invoice
  disabled: boolean
  busy: BusyAction | null
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onDuplicate: () => void
  onStatus: (status: StoredStatus) => void
  onDelete: () => void
}

export function InvoiceActionsMenu({
  invoice,
  disabled,
  busy,
  onOpenChange,
  onEdit,
  onDuplicate,
  onStatus,
  onDelete,
}: InvoiceActionsMenuProps) {
  const statusAction = availableStatusAction(invoice.status)

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${invoice.number ?? 'invoice'}`}
          className="rounded-md text-ink-muted"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={-4} alignOffset={-4}>
        <DropdownMenuItem className="px-2.5 py-2 text-body focus:bg-page" onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem className="px-2.5 py-2 text-body focus:bg-page" disabled={disabled || busy === 'duplicate'} onSelect={onDuplicate}>
          Duplicate
        </DropdownMenuItem>
        {statusAction === 'sent' ? (
          <DropdownMenuItem className="px-2.5 py-2 text-body focus:bg-page" disabled={disabled || busy === 'status'} onSelect={() => onStatus('sent')}>
            Mark as sent
          </DropdownMenuItem>
        ) : null}
        {statusAction === 'paid' ? (
          <DropdownMenuItem className="px-2.5 py-2 text-body focus:bg-page" disabled={disabled || busy === 'status'} onSelect={() => onStatus('paid')}>
            Mark as paid
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="px-2.5 py-2 text-body focus:bg-page"
          variant="destructive"
          disabled={disabled || busy === 'delete'}
          onSelect={onDelete}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
