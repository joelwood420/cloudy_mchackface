import type { MouseEvent, ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'

/**
 * A link between the landing page and the log in / sign up forms that turns the camera to the next screen.
 * The turn itself is CSS on the view transition; browsers without view transitions just change page.
 */
export function SpinLink({ to, state, direction, className, children }: { to: string; state?: unknown; direction: 'forward' | 'back'; className?: string; children: ReactNode }) {
  const navigate = useNavigate()

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // Leave new-tab clicks and the like to the browser.
    if (typeof document.startViewTransition !== 'function' || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const root = document.documentElement
    root.dataset.spin = direction
    const transition = document.startViewTransition(() => flushSync(() => navigate(to, { state })))
    void transition.finished.finally(() => delete root.dataset.spin)
  }

  return (
    <Link to={to} state={state} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}
