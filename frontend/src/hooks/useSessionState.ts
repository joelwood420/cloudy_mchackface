import { useState } from 'react'

function read<T>(key: string, isValid: (value: unknown) => value is T): T | undefined {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return undefined
    const value: unknown = JSON.parse(raw)
    return isValid(value) ? value : undefined
  } catch {
    return undefined
  }
}

/**
 * useState that survives a reload of the tab, so a page opens the way you left it (which week was open, which
 * finished tracks you expanded). Storage can be blocked or full; the state still works, it just isn't kept.
 * `isValid` checks what was stored, so a value left by an older version falls back to `initial`.
 */
export function useSessionState<T>(key: string, initial: T, isValid: (value: unknown) => value is T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, isValid) ?? initial)
  const set = (next: T) => {
    setValue(next)
    try {
      sessionStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Not kept for next time, which is fine.
    }
  }
  return [value, set]
}
