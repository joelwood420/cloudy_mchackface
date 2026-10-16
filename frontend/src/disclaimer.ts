/** Bump when the disclaimer wording changes so everyone has to accept it again. */
export const DISCLAIMER_VERSION = 1
export const CONTACT_EMAIL = 'joeldevwood@gmail.com'
const STORAGE_KEY = 'disclaimer-accepted-version'

/** Acceptance lives in this browser until accounts exist. Storage can be blocked, so failures mean "not accepted". */
export function hasAcceptedDisclaimer(): boolean {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) >= DISCLAIMER_VERSION
  } catch {
    return false
  }
}

export function recordDisclaimerAcceptance(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(DISCLAIMER_VERSION))
  } catch {
    // Storage blocked: the gate still opens for this visit.
  }
}
