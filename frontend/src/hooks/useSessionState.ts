import { useState } from 'react'

function read<T>(key: string): T | undefined {
  try {
    const raw = sessionStorage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as T)
  } catch {
    return undefined
  }
}

/**
 * useState that survives a reload of the tab, so a page opens the way you left it (which week was open, which
 * finished tracks you expanded). Storage can be blocked or full; the state still works, it just isn't kept.
 */
export function useSessionState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => read<T>(key) ?? initial)
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
