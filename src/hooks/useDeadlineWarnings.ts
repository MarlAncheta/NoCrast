import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from '../services/database'
import type { Settings } from '../services/settings'
import { notify } from '../services/notificationService'
import { DEADLINE_MESSAGES } from '../config/messages'
import { nextWarning } from '../utils/deadlines'
import { useTick } from './useTick'
import type { Toast } from '../components/common/ToastStack'

// Shows each deadline warning once per task: a desktop notification (seen from any tab or app), an on-screen notice,
// and the chosen sound.
export function useDeadlineWarnings(settings: Settings) {
  const rows = useLiveQuery(() => db.tasks.filter((t) => !t.done && !!t.deadline).toArray(), [])
  const tasks = useMemo(() => rows ?? [], [rows])
  const now = useTick(tasks.length > 0)
  const [toasts, setToasts] = useState<Toast[]>([])
  // Remembers what was just shown, so a warning cannot repeat while the saved state catches up.
  const seen = useRef(new Map<string, Set<number>>())

  useEffect(() => {
    tasks.forEach((t) => {
      if (!t.deadline) return
      const key = `${t.id}:${t.deadline}`
      const known = new Set([...(t.warnedMs ?? []), ...(seen.current.get(key) ?? [])])
      const w = nextWarning(t.deadline, known, now)
      if (!w) return
      seen.current.set(key, new Set([...known, ...w.mark]))
      void db.tasks.update(t.id, { warnedMs: [...known, ...w.mark] })
      const msg = DEADLINE_MESSAGES[w.fire.id]
      const urgent = w.fire.level === 'urgent' || w.fire.level === 'overdue'
      notify(`${msg.title}: ${t.title}`, msg.body(t.title), settings, { persist: urgent, tag: `${t.id}:${w.fire.id}` })
      setToasts((prev) => [...prev.slice(-4), { id: uid(), level: w.fire.level, title: msg.title, body: msg.body(t.title) }])
    })
  }, [now, tasks, settings])

  return {
    toasts,
    dismiss: (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id)),
    dismissAll: () => setToasts([]),
  }
}
