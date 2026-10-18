import type { ReactNode } from 'react'
import { BrandMark } from './BrandMark'

/**
 * Loading placeholders shaped like the page that's coming, so the layout doesn't jump when data lands.
 * Screen readers just hear the label.
 */
function Bar({ w, h = 12 }: { w: string; h?: number }) {
  return <span className="sk-bar" style={{ width: w, height: h }} />
}

function Loading({ label, children }: { label: string; children: ReactNode }) {
  return (
    <main className="page" aria-busy="true">
      <p role="status" className="sr-only">
        {label}
      </p>
      <div className="skeleton" aria-hidden="true">
        {children}
      </div>
    </main>
  )
}

function Header() {
  return (
    <div className="sk-header">
      <Bar w="9rem" h={34} />
      <Bar w="min(26rem, 80%)" />
    </div>
  )
}

function TaskCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card sk-card">
      <Bar w="14rem" h={16} />
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="sk-row">
          <span className="sk-box" />
          <Bar w={`${70 - i * 12}%`} />
        </span>
      ))}
    </div>
  )
}

export function ThisWeekSkeleton() {
  return (
    <Loading label="Loading this week…">
      <Header />
      <Bar w="100%" h={10} />
      <TaskCard rows={4} />
      <TaskCard rows={2} />
    </Loading>
  )
}

export function ModuleSkeleton() {
  return (
    <Loading label="Loading module…">
      <Header />
      <div className="card sk-card">
        <Bar w="8rem" h={14} />
        <Bar w="100%" h={10} />
      </div>
      {[0, 1, 2].map((i) => (
        <span key={i} className="sk-week">
          <span className="sk-dot" />
          <span className="card sk-week-card">
            <Bar w="4rem" h={10} />
            <Bar w={`${60 - i * 10}%`} h={14} />
          </span>
        </span>
      ))}
    </Loading>
  )
}

export function ListSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label}>
      <Header />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card sk-card">
          <Bar w="5rem" h={10} />
          <Bar w={`${55 + i * 10}%`} h={16} />
        </div>
      ))}
    </Loading>
  )
}

/** Before we know who you are: the bare shell, so a reload doesn't flash a blank page. */
export function ShellSkeleton() {
  return (
    <div className="shell" aria-busy="true">
      <p role="status" className="sr-only">
        Checking you're logged in…
      </p>
      <div className="sidebar sk-sidebar" aria-hidden="true">
        <BrandMark />
      </div>
      <main className="content">
        <div className="page skeleton" aria-hidden="true">
          <Header />
          <TaskCard rows={3} />
        </div>
      </main>
    </div>
  )
}
