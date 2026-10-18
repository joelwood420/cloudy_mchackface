import { useEffect, useState } from 'react'

/**
 * True for `ms` after `reached` turns from false to true while mounted. Being true on the first render doesn't count,
 * so pages that load already complete stay quiet.
 */
export function useJustReached(reached: boolean, ms: number): boolean {
  const [was, setWas] = useState(reached)
  // Counts crossings, so each new one restarts the timer; 0 means not showing.
  const [run, setRun] = useState(0)
  if (reached !== was) {
    setWas(reached)
    setRun((r) => (reached ? r + 1 : 0))
  }
  useEffect(() => {
    if (!run) return
    const id = setTimeout(() => setRun(0), ms)
    return () => clearTimeout(id)
  }, [run, ms])
  return run > 0
}
