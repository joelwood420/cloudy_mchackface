import { useEffect, useRef } from 'react'
import { useNavigationType } from 'react-router-dom'

/**
 * Put a page back where you left it after a reload or Back, once its content has loaded. A fresh visit from a link
 * starts at the top as usual.
 */
export function useRestoreScroll(key: string, ready: boolean) {
  const navigationType = useNavigationType()
  const restored = useRef(false)
  const storageKey = `scroll:${key}`

  useEffect(() => {
    if (!ready || restored.current) return
    restored.current = true
    if (navigationType !== 'POP') return
    let y = 0
    try {
      y = Number(sessionStorage.getItem(storageKey) ?? 0)
    } catch {
      return
    }
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y))
  }, [ready, navigationType, storageKey])

  useEffect(() => {
    let frame = 0
    const save = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)))
        } catch {
          // Not kept, which is fine.
        }
      })
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', save)
    }
  }, [storageKey])
}
