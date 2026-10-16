import { useQuery } from '@tanstack/react-query'
import { type AssessmentWithModule, fetchAssessments } from '../api'
import { AssessmentsRail } from '../components/AssessmentsRail'
import { ErrorMessage } from '../components/ErrorMessage'
import { useSubmitAssessment } from '../hooks/useSubmitAssessment'
import { usePageTitle } from '../usePageTitle'

function byModule(list: AssessmentWithModule[]): [string, AssessmentWithModule[]][] {
  const groups = new Map<string, AssessmentWithModule[]>()
  for (const a of list) groups.set(a.module_code, [...(groups.get(a.module_code) ?? []), a])
  return [...groups.entries()]
}

export function AssessmentsPage() {
  usePageTitle('Assessments')
  const query = useQuery({ queryKey: ['assessments'], queryFn: fetchAssessments })
  const submit = useSubmitAssessment()

  if (query.isPending) return <main className="page"><p className="muted">Loading…</p></main>
  if (query.isError) return <main className="page"><ErrorMessage error={query.error} onRetry={() => query.refetch()} /></main>

  return (
    <main className="page">
      <header className="page-header">
        <h1>Assessments</h1>
        <p className="muted">Every assessment in the programme. Tick one off once you've submitted it on UPLearn.</p>
      </header>
      {submit.isError && <p role="alert" className="error">Couldn't save that tick. Try again.</p>}
      {byModule(query.data).map(([code, list]) => (
        <section key={code} aria-label={code} className="assessments-module">
          <AssessmentsRail
            assessments={list}
            code={code}
            heading={code}
            portalUrl={null}
            onToggleSubmitted={(key, submitted) => submit.mutate({ key, submitted })}
          />
        </section>
      ))}
    </main>
  )
}
