import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StorageFailure } from '@/lib/storage'
import type { SellerProfile } from '@/lib/types'
import { ProfileDialog } from './profile-dialog'

const { writeProfileMock } = vi.hoisted(() => ({ writeProfileMock: vi.fn() }))

vi.mock('@/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage')>()
  return { ...actual, writeProfile: writeProfileMock }
})

const seededProfile: SellerProfile = {
  businessName: 'Rama Studio',
  email: 'hello@ramastudio.example',
  address: 'Bandung, Indonesia',
}

function Harness({
  profile,
  helperText,
  onSaved = () => {},
}: {
  profile: SellerProfile | null
  helperText?: string
  onSaved?: (profile: SellerProfile) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open profile
      </button>
      <ProfileDialog
        open={open}
        onOpenChange={setOpen}
        profile={profile}
        onSaved={onSaved}
        helperText={helperText}
      />
    </>
  )
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Open profile' }))
  return screen.getByRole('dialog')
}

beforeEach(() => {
  writeProfileMock.mockReset()
  writeProfileMock.mockImplementation(() => {})
})

describe('ProfileDialog', () => {
  it('renders the section 17 copy, fields, logo and helper line', async () => {
    const user = userEvent.setup()
    render(<Harness profile={seededProfile} />)
    const dialog = await openDialog(user)

    expect(within(dialog).getByRole('heading', { name: 'Seller profile' })).toBeInTheDocument()
    expect(
      within(dialog).getByText('Shown on every invoice. Saved in this browser only.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Business name')).toHaveValue('Rama Studio')
    expect(within(dialog).getByLabelText('Email')).toHaveValue('hello@ramastudio.example')
    expect(within(dialog).getByLabelText('Address')).toHaveValue('Bandung, Indonesia')
    expect(within(dialog).getByText('RS')).toBeInTheDocument()
    expect(
      within(dialog).getByText('The logo shows the initials of your business name.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Save profile' })).toBeInTheDocument()
  })

  it('shows the business name error and does not write a blank name', async () => {
    const user = userEvent.setup()
    render(<Harness profile={seededProfile} />)
    await openDialog(user)

    await user.clear(screen.getByLabelText('Business name'))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Enter your business name.')).toBeInTheDocument()
    expect(writeProfileMock).not.toHaveBeenCalled()
  })

  it('shows the email error and does not write an invalid email', async () => {
    const user = userEvent.setup()
    render(<Harness profile={seededProfile} />)
    await openDialog(user)

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(writeProfileMock).not.toHaveBeenCalled()
  })

  it('writes trimmed values, calls onSaved and closes', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<Harness profile={seededProfile} onSaved={onSaved} />)
    await openDialog(user)

    await user.clear(screen.getByLabelText('Business name'))
    await user.type(screen.getByLabelText('Business name'), '  Rama Studio  ')
    await user.clear(screen.getByLabelText('Address'))
    await user.type(screen.getByLabelText('Address'), '  Bandung, Indonesia  ')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    const expected = {
      businessName: 'Rama Studio',
      email: 'hello@ramastudio.example',
      address: 'Bandung, Indonesia',
    }
    expect(writeProfileMock).toHaveBeenCalledWith(expected)
    expect(onSaved).toHaveBeenCalledWith(expected)
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Seller profile' })).not.toBeInTheDocument(),
    )
  })

  it('discards edits on cancel and shows the saved values on reopen', async () => {
    const user = userEvent.setup()
    render(<Harness profile={seededProfile} />)
    await openDialog(user)

    await user.clear(screen.getByLabelText('Business name'))
    await user.type(screen.getByLabelText('Business name'), 'Changed name')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(writeProfileMock).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Seller profile' })).not.toBeInTheDocument(),
    )

    await openDialog(user)
    expect(screen.getByLabelText('Business name')).toHaveValue('Rama Studio')
  })

  it('shows the first-run helper text when provided', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        profile={null}
        helperText="Add your business details before creating an invoice."
      />,
    )
    await openDialog(user)

    expect(
      screen.getByText('Add your business details before creating an invoice.'),
    ).toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<Harness profile={seededProfile} />)
    const trigger = screen.getByRole('button', { name: 'Open profile' })
    await user.click(trigger)
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')

    await waitFor(() => expect(trigger).toHaveFocus())
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Seller profile' })).not.toBeInTheDocument(),
    )
  })

  it('shows values that load after mount when the dialog opens', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness profile={null} />)
    rerender(<Harness profile={seededProfile} />)

    await openDialog(user)

    expect(screen.getByLabelText('Business name')).toHaveValue('Rama Studio')
    expect(screen.getByLabelText('Email')).toHaveValue('hello@ramastudio.example')
    expect(screen.getByLabelText('Address')).toHaveValue('Bandung, Indonesia')
  })

  it('focuses the first invalid field in section 15 order', async () => {
    const user = userEvent.setup()
    render(<Harness profile={null} />)
    await openDialog(user)

    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(screen.getByLabelText('Business name')).toHaveFocus()

    await user.type(screen.getByLabelText('Business name'), 'Rama Studio')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(screen.getByLabelText('Email')).toHaveFocus()

    await user.type(screen.getByLabelText('Email'), 'hello@ramastudio.example')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(screen.getByLabelText('Address')).toHaveFocus()
  })

  it('stays open and shows the section 15 storage error when writing fails', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    writeProfileMock.mockImplementation(() => {
      throw new StorageFailure('write', 'Could not save the profile.')
    })
    render(<Harness profile={seededProfile} onSaved={onSaved} />)
    await openDialog(user)

    await user.clear(screen.getByLabelText('Business name'))
    await user.type(screen.getByLabelText('Business name'), 'Nusa Creative')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save to this browser. Your changes are still here. Please try again.',
    )
    expect(screen.getByLabelText('Business name')).toHaveValue('Nusa Creative')
    expect(screen.getByRole('heading', { name: 'Seller profile' })).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
