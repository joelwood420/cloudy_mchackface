import type { CSSProperties } from 'react'
import { weekClearedLine } from '../rewards'

/** How long the readout stays up after the last task of a week is ticked. */
export const READOUT_MS = 4000

/** A terminal line for a week just cleared. The slot is always rendered so screen readers announce the line. */
export function WeekClearedReadout({ weekNumber, show }: { weekNumber: number; show: boolean }) {
  const text = weekClearedLine(weekNumber)
  return (
    <p className="readout" role="status">
      {show && (
        <>
          <span className="sr-only">{`Week ${weekNumber} cleared.`}</span>
          <span className="readout-line" aria-hidden="true" style={{ '--chars': text.length } as CSSProperties}>
            {text}
          </span>
        </>
      )}
    </p>
  )
}
