import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'edit'; id: string }
  | { name: 'preview'; id: string }
  | { name: 'unknown' }

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function readIndex(): number {
  const state: unknown = window.history.state
  if (typeof state === 'object' && state !== null && '__routerIndex' in state) {
    const index = (state as { __routerIndex: unknown }).__routerIndex
    if (typeof index === 'number') return index
  }
  return 0
}

if (typeof window !== 'undefined') {
  const state: unknown = window.history.state
  const hasIndex =
    typeof state === 'object' && state !== null && typeof (state as { __routerIndex?: unknown }).__routerIndex === 'number'
  if (!hasIndex) {
    const base = typeof state === 'object' && state !== null ? state : {}
    window.history.replaceState({ ...base, __routerIndex: 0 }, '')
  }
  window.addEventListener('popstate', emit)
}

export function usePathname(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => window.location.pathname,
  )
}

export function navigate(to: string, options?: { replace?: boolean }): void {
  const target = new URL(to, window.location.href)
  const next = `${target.pathname}${target.search}${target.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === current) return

  const index = readIndex()
  const state = { __routerIndex: options?.replace ? index : index + 1 }
  if (options?.replace) window.history.replaceState(state, '', next)
  else window.history.pushState(state, '', next)
  emit()
}

export function goBack(): void {
  if (readIndex() > 0) {
    window.history.back()
    return
  }
  navigate('/', { replace: true })
}

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

export function matchRoute(pathname: string): Route {
  const path = pathname.split(/[?#]/)[0] ?? ''
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path
  const rawParts = trimmed.split('/')
  const parts: string[] = []
  for (const part of rawParts) {
    const decoded = safeDecode(part)
    if (decoded === null || decoded.includes('/')) return { name: 'unknown' }
    parts.push(decoded)
  }

  if (parts.length === 2 && parts[0] === '' && parts[1] === '') return { name: 'list' }
  if (parts.length === 3 && parts[0] === '' && parts[1] === 'invoices') {
    if (parts[2] === 'new') return { name: 'new' }
    if (parts[2] !== '') return { name: 'preview', id: parts[2] }
  }
  if (parts.length === 4 && parts[0] === '' && parts[1] === 'invoices' && parts[3] === 'edit') {
    if (parts[2] !== '') return { name: 'edit', id: parts[2] }
  }
  return { name: 'unknown' }
}

