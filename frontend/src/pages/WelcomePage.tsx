import { Link, useLocation } from 'react-router-dom'
import { BrandLockup } from '../components/BrandMark'
import { usePageTitle } from '../usePageTitle'

/** Where logged-out visitors land: a clear choice between making an account and logging in. */
export function WelcomePage() {
  usePageTitle('Welcome')
  const location = useLocation()

  return (
    <main className="auth-page">
      <div className="card auth-card">
        <BrandLockup />
        <h1>Your week-by-week study guide</h1>
        <p className="muted">
          See what to work on this week for the Level 6 Cloud &amp; Cyber diploma, tick it off, and keep on top of your
          assessments.
        </p>
        <div className="welcome-actions">
          <Link to="/signup" state={location.state} className="button-primary">
            Get started
          </Link>
          <Link to="/login" state={location.state} className="button-secondary">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </main>
  )
}
