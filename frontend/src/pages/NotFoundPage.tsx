import { Link } from 'react-router-dom'
import { usePageTitle } from '../usePageTitle'

export function NotFoundPage() {
  usePageTitle('Page not found')
  return (
    <main className="page">
      <h1>Page not found</h1>
      <Link to="/" className="back-link">Back to this week</Link>
    </main>
  )
}
