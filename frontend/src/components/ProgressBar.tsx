export function ProgressBar({
  value,
  label,
  size = 'md',
  decorative = false,
}: {
  value: number
  label: string
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
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
