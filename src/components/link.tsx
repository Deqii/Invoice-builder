import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigate } from '@/lib/router'

export function Link({
  href,
  onClick,
  target,
  download,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (target !== undefined && target !== '_self') return
    if (download !== undefined) return

    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) return

    event.preventDefault()
    navigate(`${url.pathname}${url.search}${url.hash}`)
  }

  return <a href={href} target={target} download={download} onClick={handleClick} {...props} />
}
