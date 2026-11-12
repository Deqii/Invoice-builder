import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { createEvent, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link } from '@/components/link'
import { goBack, matchRoute, navigate, usePathname } from './router'

function resetTo(path: string) {
  window.history.replaceState({ __routerIndex: 0 }, '', path)
}

beforeEach(() => {
  resetTo('/')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('matchRoute', () => {
  it('matches every known route', () => {
    expect(matchRoute('/')).toEqual({ name: 'list' })
    expect(matchRoute('/invoices/new')).toEqual({ name: 'new' })
    expect(matchRoute('/invoices/abc/edit')).toEqual({ name: 'edit', id: 'abc' })
    expect(matchRoute('/invoices/abc')).toEqual({ name: 'preview', id: 'abc' })
    expect(matchRoute('/nope')).toEqual({ name: 'unknown' })
  })

  it('matches new before the id pattern', () => {
    expect(matchRoute('/invoices/new')).toEqual({ name: 'new' })
    expect(matchRoute('/invoices/new/edit')).toEqual({ name: 'edit', id: 'new' })
  })

  it('tolerates trailing slashes', () => {
    expect(matchRoute('/invoices/new/')).toEqual({ name: 'new' })
    expect(matchRoute('/invoices/abc/')).toEqual({ name: 'preview', id: 'abc' })
    expect(matchRoute('/invoices/abc/edit/')).toEqual({ name: 'edit', id: 'abc' })
    expect(matchRoute('/')).toEqual({ name: 'list' })
  })

  it('ignores query strings and hashes', () => {
    expect(matchRoute('/invoices/abc?tab=1')).toEqual({ name: 'preview', id: 'abc' })
    expect(matchRoute('/invoices/abc#notes')).toEqual({ name: 'preview', id: 'abc' })
    expect(matchRoute('/invoices/abc/edit?x=1#y')).toEqual({ name: 'edit', id: 'abc' })
  })

  it('never throws on malformed percent-encoding and yields unknown', () => {
    expect(() => matchRoute('/invoices/%E0%A4%A')).not.toThrow()
    expect(matchRoute('/invoices/%E0%A4%A')).toEqual({ name: 'unknown' })
    expect(matchRoute('/invoices/%2F/edit')).toEqual({ name: 'unknown' })
  })
})

describe('navigate and usePathname', () => {
  it('pushes history and notifies subscribers', async () => {
    const { result } = renderHook(() => usePathname())
    const push = vi.spyOn(window.history, 'pushState')

    navigate('/invoices/abc')

    expect(push).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(result.current).toBe('/invoices/abc'))
  })

  it('does not push a duplicate entry for the current path', () => {
    navigate('/invoices/abc')
    const push = vi.spyOn(window.history, 'pushState')

    navigate('/invoices/abc')

    expect(push).not.toHaveBeenCalled()
  })

  it('replaces history when asked', () => {
    const push = vi.spyOn(window.history, 'pushState')
    const replace = vi.spyOn(window.history, 'replaceState')

    navigate('/invoices/abc', { replace: true })

    expect(push).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('restores each screen on browser back and forward', async () => {
    const { result } = renderHook(() => usePathname())

    navigate('/invoices/abc')
    navigate('/invoices/abc/edit')
    await waitFor(() => expect(result.current).toBe('/invoices/abc/edit'))

    window.history.back()
    await waitFor(() => expect(result.current).toBe('/invoices/abc'))

    window.history.forward()
    await waitFor(() => expect(result.current).toBe('/invoices/abc/edit'))
  })
})

describe('goBack', () => {
  it('calls history.back when an in-app previous entry exists', () => {
    navigate('/invoices/abc')
    const back = vi.spyOn(window.history, 'back')

    goBack()

    expect(back).toHaveBeenCalledTimes(1)
  })

  it('navigates to the list when there is no in-app previous entry', () => {
    resetTo('/invoices/abc')
    const back = vi.spyOn(window.history, 'back')

    goBack()

    expect(back).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/')
  })
})

describe('Link', () => {
  function renderLink(props: Record<string, unknown> = {}) {
    render(
      <Link href="/invoices/abc" {...props}>
        Open invoice
      </Link>,
    )
    return screen.getByText('Open invoice')
  }

  it('renders an anchor with the href', () => {
    const anchor = renderLink()
    expect(anchor.tagName).toBe('A')
    expect(anchor).toHaveAttribute('href', '/invoices/abc')
  })

  it('navigates on a plain left click', () => {
    const anchor = renderLink()
    const push = vi.spyOn(window.history, 'pushState')

    fireEvent.click(anchor, { button: 0 })

    expect(push).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/invoices/abc')
  })

  it.each([
    ['meta', { metaKey: true }],
    ['ctrl', { ctrlKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['non-left button', { button: 1 }],
    ['right button', { button: 2 }],
  ])('ignores a %s click', (_label, init) => {
    const anchor = renderLink()
    const push = vi.spyOn(window.history, 'pushState')

    fireEvent.click(anchor, init)

    expect(push).not.toHaveBeenCalled()
  })

  it('ignores a target other than _self', () => {
    const anchor = renderLink({ target: '_blank' })
    const push = vi.spyOn(window.history, 'pushState')

    fireEvent.click(anchor)

    expect(push).not.toHaveBeenCalled()
  })

  it('ignores a download link', () => {
    const anchor = renderLink({ download: '' })
    const push = vi.spyOn(window.history, 'pushState')

    fireEvent.click(anchor)

    expect(push).not.toHaveBeenCalled()
  })

  it('ignores a click whose default is already prevented', () => {
    const anchor = renderLink()
    const push = vi.spyOn(window.history, 'pushState')
    const event = createEvent.click(anchor)
    event.preventDefault()

    fireEvent(anchor, event)

    expect(push).not.toHaveBeenCalled()
  })

  it('ignores a link to another origin', () => {
    render(
      <Link href="https://example.com/invoices/abc">Open invoice</Link>,
    )
    const anchor = screen.getByText('Open invoice')
    const push = vi.spyOn(window.history, 'pushState')

    fireEvent.click(anchor)

    expect(push).not.toHaveBeenCalled()
  })
})
