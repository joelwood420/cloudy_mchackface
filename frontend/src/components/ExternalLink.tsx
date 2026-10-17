/** A link that opens in a new tab. Its accessible name says so; a `label` should start with the visible text. */
export function ExternalLink({ href, children, label }: { href: string; children: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label ?? children} (opens in new tab)`}>
      {children}
    </a>
  )
}
