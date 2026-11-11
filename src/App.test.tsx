import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { sellerProfile } from '../tests/fixtures/seed'
import App from './App'
import { STORAGE_KEYS } from './lib/storage'

beforeEach(() => {
  localStorage.clear()
})

describe('App', () => {
  it('renders the app shell', () => {
    render(<App />)
    expect(screen.getByText('Invoice Builder')).toBeInTheDocument()
  })

  it('opens the profile dialog from the avatar and updates it after save', async () => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(sellerProfile))
    const user = userEvent.setup()
    render(<App />)

    const avatar = screen.getByRole('button', { name: 'Seller profile' })
    await waitFor(() => expect(avatar).toHaveTextContent('RS'))
    await user.click(avatar)

    expect(screen.getByLabelText('Business name')).toHaveValue('Rama Studio')
    await user.clear(screen.getByLabelText('Business name'))
    await user.type(screen.getByLabelText('Business name'), 'Nusa Creative')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Seller profile' })).toHaveTextContent('NC'),
    )

    await user.click(screen.getByRole('button', { name: 'Seller profile' }))
    expect(screen.getByLabelText('Business name')).toHaveValue('Nusa Creative')

    await user.clear(screen.getByLabelText('Business name'))
    await user.type(screen.getByLabelText('Business name'), 'Discarded')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Seller profile' })).not.toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Seller profile' }))
    expect(screen.getByLabelText('Business name')).toHaveValue('Nusa Creative')
  })
})
