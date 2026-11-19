import { useEffect, useRef } from 'react'
import type { DeadlineLevel } from '../../utils/deadlines'

export interface Toast {
  id: string
  level: DeadlineLevel
  title: string
  body: string
}

const LEVEL_STYLE: Record<DeadlineLevel, string> = {
  early: 'bg-sun text-night',
  soon: 'bg-brand text-night',
  urgent: 'bg-red text-night',
  overdue: 'bg-red text-night',
}
const MAX_SHOWN = 3

// Notices sit in the bottom-right corner (full width on a phone), newest at the bottom, and never overlap each other.
// They stay until dismissed. The empty gaps let clicks through, and the page gets extra room underneath
// (the --toast-space variable) so anything a notice covers can be scrolled clear of it.
export function ToastStack({
  toasts,
  onDismiss,
  onDismissAll,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
  onDismissAll?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const reserve = () => root.style.setProperty('--toast-space', `${el.offsetHeight + 24}px`)
    reserve()
    const observer = new ResizeObserver(reserve)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.setProperty('--toast-space', '0px')
    }
  }, [toasts.length])

  if (toasts.length === 0) return null
  const shown = toasts.slice(-MAX_SHOWN)
  const hidden = toasts.length - shown.length

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
    >
      {hidden > 0 && (
        <p className="pointer-events-auto rounded-xl border border-white/15 bg-night px-3 py-1.5 text-sm font-bold text-snow">
          {hidden} earlier notice{hidden > 1 ? 's' : ''}
        </p>
      )}
      {shown.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`toast-in pointer-events-auto flex items-start gap-3 rounded-2xl p-3 shadow-lg ${LEVEL_STYLE[t.level]}`}
        >
          <div className="min-w-0 flex-1">
            <p className="font-black">{t.level === 'overdue' ? 'OVERDUE' : t.title}</p>
            <p className="text-sm break-words">{t.body}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 rounded-full bg-night px-3 py-1 text-sm font-bold text-snow focus-visible:outline-night"
          >
            Dismiss
          </button>
        </div>
      ))}
      {toasts.length > 1 && onDismissAll && (
        <button
          type="button"
          onClick={onDismissAll}
          className="pointer-events-auto self-end rounded-full border border-white/15 bg-night px-3 py-1 text-sm font-bold text-snow"
        >
          Dismiss all
        </button>
      )}
    </div>
  )
}
