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
  if (decorative) {
    return (
      <div className={`progress progress-${size}`} aria-hidden="true">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
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
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
