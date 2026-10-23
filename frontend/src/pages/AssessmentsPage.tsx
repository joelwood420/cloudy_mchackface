import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { type AssessmentWithModule, fetchAssessments } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'
import { ExternalLink } from '../components/ExternalLink'
import { ResourceColumns } from '../components/ResourceColumns'
import { ListSkeleton } from '../components/Skeleton'
import { formatDueDate, statusChip } from '../format'
import { useSubmitAssessment } from '../hooks/useSubmitAssessment'
import { uplearnLabel, uplearnName } from '../uplearn'
import { usePageTitle } from '../usePageTitle'

/** Soonest first; ones without a date go last, in the order the server gave them. */
function byDue(a: AssessmentWithModule, b: AssessmentWithModule): number {
  if (a.days_until === null || b.days_until === null) return (a.days_until === null ? 1 : 0) - (b.days_until === null ? 1 : 0)
  return a.days_until - b.days_until
}

type Toggle = (a: AssessmentWithModule, submitted: boolean) => void

/** The assessment's links, grouped. Starts open on the lead row and on the row the URL's #hash names. */
function Resources({ a, startOpen }: { a: AssessmentWithModule; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen)
  const panelId = useId()
  const resources = a.resources ?? []
  if (resources.length === 0) return null
  return (
    <div className="assessment-resources">
      <button type="button" className="link-button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        {`Resources (${resources.length})`}
      </button>
      {open && (
        <div id={panelId}>
          <ResourceColumns resources={resources} groups={['recording', 'code_data', 'tool', 'submitting']} />
        </div>
      )}
    </div>
  )
}

function AssessmentRow({ a, lead = false, onToggle }: { a: AssessmentWithModule; lead?: boolean; onToggle: Toggle }) {
  const chip = statusChip(a)
  const titleId = `assessment-${a.key}-title`
  const { hash } = useLocation()
  return (
    <li id={a.key} className={`assessment-row${lead ? ' is-lead card' : ''}${a.submitted ? ' is-submitted' : ''}`}>
      <span className="assessment-code mono small">{a.module_code}</span>
      <div className="assessment-row-main">
        <h3 id={titleId} className="assessment-title">
          {a.title}
        </h3>
        <span className="muted small">{a.due_date ? `Due ${formatDueDate(a.due_date)}` : 'Due date: see programme guide'}</span>
      </div>
      {chip && <span className={`status-chip ${chip.tone}`.trim()}>{chip.label}</span>}
      <div className="assessment-row-actions">
        <label className="submitted-toggle">
          <input type="checkbox" checked={a.submitted} onChange={() => onToggle(a, !a.submitted)} aria-describedby={titleId} />
          Mark submitted
        </label>
        {a.uplearn_url && (
          <span className="task-links">
            <ExternalLink href={a.uplearn_url} label={uplearnName(uplearnLabel(a.uplearn_url), a.title)}>
              {uplearnLabel(a.uplearn_url)}
            </ExternalLink>
          </span>
        )}
      </div>
      <Resources a={a} startOpen={lead || hash === `#${a.key}`} />
    </li>
  )
}

export function AssessmentsPage() {
  usePageTitle('Assessments')
  const query = useQuery({ queryKey: ['assessments'], queryFn: fetchAssessments })
  const submit = useSubmitAssessment()
  // null until the student toggles it; until then it follows the #hash (open when it names a submitted one)
  const [submittedToggled, setShowSubmitted] = useState<boolean | null>(null)
  const [note, setNote] = useState('')
  const submittedToggle = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const { hash } = useLocation()

  const hashTarget = query.data?.find((a) => `#${a.key}` === hash)
  const showSubmitted = submittedToggled ?? Boolean(hashTarget?.submitted)

  // Arriving from a This week "All A3 resources" link: bring that assessment into view.
  useEffect(() => {
    if (hashTarget) requestAnimationFrame(() => document.getElementById(hashTarget.key)?.scrollIntoView?.({ block: 'start' }))
  }, [hashTarget])

  if (query.isPending) return <ListSkeleton label="Loading assessments…" />
  if (query.isError) return <main className="page"><ErrorMessage error={query.error} onRetry={() => query.refetch()} /></main>

  // A ticked row moves to another list, so its box disappears. Say what happened and park focus on the Submitted
  // toggle (or the page heading if that section has gone), rather than leaving it on whatever row slid into place.
  const onToggle: Toggle = (a, submitted) => {
    submit.mutate({ key: a.key, submitted })
    setNote(`${a.title} marked ${submitted ? 'submitted' : 'not submitted'}.`)
    requestAnimationFrame(() => (submittedToggle.current ?? heading.current)?.focus())
  }
  const open = query.data.filter((a) => !a.submitted).sort(byDue)
  const submitted = query.data.filter((a) => a.submitted)
  // The lead is the next real deadline; overdue ones still count, since they need doing first.
  const lead = open.length > 0 && open[0].days_until !== null ? open[0] : null
  const rest = lead ? open.slice(1) : open

  return (
    <main className="page assessments-page">
      <header className="page-header">
        <h1 ref={heading} tabIndex={-1}>
          Assessments
        </h1>
        <p className="muted">Every assessment in the programme, soonest first. Tick one off once you've submitted it on UPLearn.</p>
      </header>
      <p role="status" className="sr-only">
        {note}
      </p>
      {submit.isError && <p role="alert" className="error">Couldn't save that tick. Try again.</p>}
      {query.data.length === 0 && <p className="muted">No assessments listed yet.</p>}

      {lead && (
        <section aria-labelledby="next-due-heading" className="assessments-section">
          <h2 id="next-due-heading">Next due</h2>
          <ul className="assessment-list">
            <AssessmentRow key={lead.key} a={lead} lead onToggle={onToggle} />
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="coming-up-heading" className="assessments-section">
          <h2 id="coming-up-heading">{lead ? 'After that' : 'Still to submit'}</h2>
          <ul className="card assessment-list">
            {rest.map((a) => (
              <AssessmentRow key={a.key} a={a} onToggle={onToggle} />
            ))}
          </ul>
        </section>
      )}

      {open.length === 0 && submitted.length > 0 && <p className="notice">Everything's submitted. Nice work.</p>}

      {submitted.length > 0 && (
        <section aria-labelledby="submitted-heading" className="assessments-section">
          <div className="section-head">
            <h2 id="submitted-heading">{`Submitted (${submitted.length})`}</h2>
            <button ref={submittedToggle} type="button" className="link-button" aria-expanded={showSubmitted} aria-controls="submitted-list" onClick={() => setShowSubmitted(!showSubmitted)}>
              {showSubmitted ? 'Hide' : 'Show'}
            </button>
          </div>
          {showSubmitted && (
            <ul className="card assessment-list" id="submitted-list">
              {submitted.map((a) => (
                <AssessmentRow key={a.key} a={a} onToggle={onToggle} />
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
