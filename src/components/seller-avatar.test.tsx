import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SellerAvatar } from './seller-avatar'

describe('SellerAvatar', () => {
  it('renders IB and the accessible name when there is no business name', () => {
    render(<SellerAvatar businessName="" />)

    const avatar = screen.getByLabelText('Seller profile')
    expect(avatar).toHaveTextContent('IB')
  })
})
