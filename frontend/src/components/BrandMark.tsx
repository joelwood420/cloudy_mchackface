/** The cloud logo. Decorative: the name always sits next to it in text. */
export function BrandMark({ width = 60, height = 44 }: { width?: number; height?: number }) {
  return (
    <svg className="brand-mark" aria-hidden="true" width={width} height={height} viewBox="10 -12 192 140" fill="none">
      <path d="M50 120 H160 A35 35 0 0 0 160 50 A50 50 0 0 0 65 40 A40 40 0 0 0 50 120 Z" fill="#fff" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
      <g fill="currentColor">
        <path d="M52 58h108v6H52zM58 64h42v6H58zM112 64h42v6h-42zM64 70h30v6H64zM118 70h30v6h-30zM70 76h18v6H70zM124 76h18v6h-18z" />
        <path d="M100 98h18v6h-18zM118 92h6v6h-6z" />
      </g>
      <path className="brand-glint" d="M64 64h6v6h-6zM118 64h6v6h-6z" fill="#fff" />
    </svg>
  )
}

/** Logo, name and the one-line pitch, for the screens you see before the app (disclaimer, log in, sign up). */
export function BrandLockup() {
  return (
    <div className="brand-lockup">
      <BrandMark />
      <span className="brand-text">
        <span className="brand-name">Cloudy McHackface</span>
        <span className="brand-sub">What to do this week, and where it lives in UPLearn.</span>
      </span>
    </div>
  )
}
