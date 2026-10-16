import { usePageTitle } from '../usePageTitle'

export function ThisWeekPage() {
  usePageTitle('This week')
  return (
    <main className="page">
      <h1>This week</h1>
    </main>
  )
}
