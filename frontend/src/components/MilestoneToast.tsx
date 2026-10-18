import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { fetchModules } from '../api'
import { crossedMilestone, milestoneMessage } from '../rewards'

/** How long a milestone toast stays up. Finishing a module gets longer. */
const TOAST_MS = 5000
const OWNED_MS = 8000

interface Toast {
  id: number
  text: string
  owned: boolean
}

/**
 * Watches each module's completed count and pops a toast when a tick takes a module past 25, 50, 75 or 100%.
 * The tick hooks move the counts straight away, so the toast lands with the tick, not after the server sync.
 */
export function MilestoneToast() {
  const modules = useQuery({ queryKey: ['modules'], queryFn: fetchModules })
  const seen = useRef<Map<string, number> | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    const data = modules.data
    if (!data) return
    const before = seen.current
    seen.current = new Map(data.map((m) => [m.key, m.completed_count]))
    if (!before) return
    for (const m of data) {
      const was = before.get(m.key)
      const milestone = was === undefined ? null : crossedMilestone(was, m.completed_count, m.task_count)
      if (milestone) setToast({ id: Date.now(), text: milestoneMessage(m.code, milestone), owned: milestone === 100 })
    }
  }, [modules.data])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), toast.owned ? OWNED_MS : TOAST_MS)
    return () => clearTimeout(id)
  }, [toast])

  return (
    <div className="toast-region" role="status">
      {toast && (
        <div key={toast.id} className={`toast${toast.owned ? ' is-owned' : ''}`}>
          <span className="toast-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l4 4-4 4M12 17h7" />
            </svg>
          </span>
          <p className="toast-text">{toast.text}</p>
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => setToast(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
