import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { recordDisclaimerAcceptance } from '../disclaimer'

// Most tests are about the app behind the gate; DisclaimerGate.test.tsx clears this itself.
beforeEach(() => {
  recordDisclaimerAcceptance()
})

// jsdom doesn't lay pages out, so it has no scrollIntoView.
Element.prototype.scrollIntoView = () => {}

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})
