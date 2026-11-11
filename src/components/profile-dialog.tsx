import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { LogoMark } from '@/components/logo-mark'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { validateProfile } from '@/lib/profile'
import { writeProfile } from '@/lib/storage'
import type { SellerProfile } from '@/lib/types'

export interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: SellerProfile | null
  onSaved: (profile: SellerProfile) => void
  helperText?: string
}

const EMPTY_PROFILE: SellerProfile = { businessName: '', email: '', address: '' }
const FIELD_ORDER = ['businessName', 'email', 'address'] as const

export function ProfileDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
  helperText,
}: ProfileDialogProps) {
  const trigger = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      trigger.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 p-6 max-sm:p-5"
        onCloseAutoFocus={(event) => {
          if (trigger.current) {
            event.preventDefault()
            trigger.current.focus()
          }
        }}
      >
        <DialogHeader className="text-left">
          <DialogTitle>Seller profile</DialogTitle>
          <DialogDescription>
            Shown on every invoice. Saved in this browser only.
          </DialogDescription>
        </DialogHeader>
        <ProfileForm
          profile={profile}
          helperText={helperText}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ProfileForm({
  profile,
  helperText,
  onSaved,
  onClose,
}: {
  profile: SellerProfile | null
  helperText?: string
  onSaved: (profile: SellerProfile) => void
  onClose: () => void
}) {
  const form = useForm<SellerProfile>({ defaultValues: profile ?? EMPTY_PROFILE })
  const businessName = useWatch({ control: form.control, name: 'businessName' })
  const [formError, setFormError] = useState<string | null>(null)

  function onSubmit(values: SellerProfile) {
    const trimmed: SellerProfile = {
      businessName: values.businessName.trim(),
      email: values.email.trim(),
      address: values.address.trim(),
    }
    const errors = validateProfile(trimmed)
    if (Object.keys(errors).length > 0) {
      setFormError(null)
      for (const field of FIELD_ORDER) {
        const message = errors[field]
        if (message) form.setError(field, { message })
      }
      const firstInvalid = FIELD_ORDER.find((field) => errors[field])
      if (firstInvalid) form.setFocus(firstInvalid)
      return
    }

    try {
      writeProfile(trimmed)
    } catch {
      setFormError(
        'Could not save to this browser. Your changes are still here. Please try again.',
      )
      return
    }

    onSaved(trimmed)
    onClose()
  }

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="mt-5 grid gap-4">
        {helperText ? <p className="text-body text-ink-muted">{helperText}</p> : null}
        {formError ? (
          <p role="alert" className="text-body text-danger">
            {formError}
          </p>
        ) : null}

        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3">
          <LogoMark businessName={businessName} />
          <p className="text-body text-ink-muted">
            The logo shows the initials of your business name.
          </p>
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save profile</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
