import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate, isValidISODate } from '@/lib/dates'

export interface DateFieldProps {
  id: string
  label: string
  ariaLabel: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

function toLocalDate(iso: string): Date | undefined {
  if (!isValidISODate(iso)) return undefined
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toISO(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DateField({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  required = false,
  error,
}: DateFieldProps) {
  const [open, setOpen] = useState(false)

  function handleSelect(date: Date | undefined) {
    if (date) {
      onChange(toISO(date))
      setOpen(false)
      return
    }
    if (!required) {
      onChange('')
      setOpen(false)
    }
  }

  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 text-body-medium">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="h-9 w-full justify-between rounded-lg border-line-strong bg-paper px-3 text-body font-normal shadow-none"
          >
            <span className={value === '' ? 'text-ink-faint' : 'text-ink'}>
              {value === '' ? 'Choose a date' : formatDate(value)}
            </span>
            <CalendarDays className="-mr-px size-4 text-ink-faint" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            defaultMonth={toLocalDate(value)}
            selected={toLocalDate(value)}
            onSelect={handleSelect}
            required={required}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-body text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
