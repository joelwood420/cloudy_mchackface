import type { ReactNode } from 'react'
import { useJustReached } from '../hooks/useJustReached'

/** How long the slam runs when something is finished while you watch. */
export const SLAM_MS = 900

/**
 * A tilted ink stamp shown once something is complete. Keep it mounted while incomplete: it slams down when `complete`
 * turns true in front of you, and simply sits there when the page loads already complete.
 */
export function CompletionStamp({
  complete,
  size,
  children,
  slot = false,
}: {
  complete: boolean
  size: 'sm' | 'md' | 'lg'
  children: ReactNode
  /** Wrap the stamp in its own row so it never covers anything. */
  slot?: boolean
}) {
  const slam = useJustReached(complete, SLAM_MS)
  if (!complete) return null
  const stamp = <span className={`stamp stamp-${size}${slam ? ' is-slam' : ''}`}>{children}</span>
  return slot ? <div className="stamp-slot">{stamp}</div> : stamp
}

/** A screen-reader-only live region that says `text` for a moment when `show` turns true. */
export function LiveNote({ text, show }: { text: string; show: boolean }) {
  return (
    <span role="status" className="sr-only">
      {show ? text : ''}
    </span>
  )
}
