import { useEffect, useRef } from 'react'
import { db, uid } from '../services/database'
import { classifyAway, isInactive, shouldLogAway, type EventKind } from '../utils/classify'

const INACTIVITY_MS = 3 * 60_000

// Records tab switches and possible inactivity while `active` is true (an open task, not on a break).
export function useDistractionTracker(
  taskId: string | null,
  active: boolean,
  inactivityMs = INACTIVITY_MS,
  trackTabs = true,
  minAwayMs = 10_000,
) {
  const hiddenAt = useRef<number | null>(null)
  const lastActivity = useRef(Date.now())
  const flagged = useRef(false)

  useEffect(() => {
    if (!taskId || !active) return
    // Start fresh so time before tracking began (or during a break) is never counted.
    lastActivity.current = Date.now()
    flagged.current = false
    hiddenAt.current = null

    const log = (kind: EventKind, durationMs: number) =>
      db.events.add({ id: uid(), sessionId: taskId, kind, at: Date.now(), durationMs, verdict: 'unreviewed' })

    const onVisibility = () => {
      if (document.hidden) hiddenAt.current = Date.now()
      else if (hiddenAt.current !== null) {
        const away = Date.now() - hiddenAt.current
        hiddenAt.current = null
        if (shouldLogAway(away, minAwayMs)) void log(classifyAway(away), away)
      }
    }
    const onActivity = () => {
      lastActivity.current = Date.now()
      flagged.current = false
    }
    const check = setInterval(() => {
      if (!flagged.current && !document.hidden && isInactive(lastActivity.current, Date.now(), inactivityMs)) {
        flagged.current = true
        void log('inactivity', Date.now() - lastActivity.current)
      }
    }, 5000)

    const types = ['mousemove', 'keydown', 'scroll', 'pointerdown'] as const
    if (trackTabs) document.addEventListener('visibilitychange', onVisibility)
    types.forEach((t) => window.addEventListener(t, onActivity, { passive: true }))
    return () => {
      clearInterval(check)
      document.removeEventListener('visibilitychange', onVisibility)
      types.forEach((t) => window.removeEventListener(t, onActivity))
    }
  }, [taskId, active, inactivityMs, trackTabs, minAwayMs])
}
