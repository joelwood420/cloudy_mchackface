import { useState, type ReactNode } from 'react'
import { hasAcceptedDisclaimer, recordDisclaimerAcceptance } from '../disclaimer'
import { DisclaimerText } from './DisclaimerText'

/** Blocks the whole app until the disclaimer is accepted. */
export function DisclaimerGate({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState(hasAcceptedDisclaimer)

  if (accepted) return children

  function accept() {
    recordDisclaimerAcceptance()
    setAccepted(true)
  }

  return (
    <main className="gate">
      <div className="gate-card card">
        <h1>Before you start</h1>
        <DisclaimerText />
        <div className="gate-actions">
          <button type="button" className="button-primary" onClick={accept}>
            I understand and accept
          </button>
          <a href="https://yoobee.uplearn.education/" className="button-secondary">
            Go to UPLearn instead
          </a>
        </div>
      </div>
    </main>
  )
}
