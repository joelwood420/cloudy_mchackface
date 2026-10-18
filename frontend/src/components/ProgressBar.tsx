import { useJustReached } from '../hooks/useJustReached'

/** How long the one-off light sweep runs when a bar fills up. */
const SWEEP_MS = 1200

export function ProgressBar({
  value,
  label,
  valueText,
  size = 'md',
  decorative = false,
}: {
  value: number
  label: string
  /** What the bar counts, for screen readers, e.g. "3 of 5 tasks done". */
  valueText?: string
  size?: 'sm' | 'md' | 'lg'
  decorative?: boolean
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  // A bar that fills while you watch gets a light sweep; one that loads full doesn't.
  const sweeping = useJustReached(pct === 100, SWEEP_MS)
  const fill = <div className={`progress-fill${sweeping ? ' is-sweeping' : ''}`} style={{ width: `${pct}%` }} />
  if (decorative) {
    return (
      <div className={`progress progress-${size}`} aria-hidden="true">
        {fill}
      </div>
    )
  }
  return (
    <div
      className={`progress progress-${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={valueText ? `${pct}%, ${valueText}` : undefined}
    >
      {fill}
    </div>
  )
}
