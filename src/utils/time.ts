export interface TimerState {
  sessionId: string
  taskId: string
  startedAt: number
  pausedAt: number | null
  pausedTotal: number
}

// Timestamps are the source of truth; intervals only trigger re-renders.
export const elapsedMs = (s: TimerState, now: number) => Math.max(0, (s.pausedAt ?? now) - s.startedAt - s.pausedTotal)

export const pauseTimer = (s: TimerState, now: number): TimerState => (s.pausedAt === null ? { ...s, pausedAt: now } : s)

export const resumeTimer = (s: TimerState, now: number): TimerState =>
  s.pausedAt === null ? s : { ...s, pausedAt: null, pausedTotal: s.pausedTotal + (now - s.pausedAt) }

export const formatHMS = (ms: number) => {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`
}

export const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0)

export const resetTimer = (s: TimerState, now: number): TimerState => ({
  ...s,
  startedAt: now,
  pausedAt: s.pausedAt === null ? null : now,
  pausedTotal: 0,
})

// A coarse, calm "how long ago" for labels that should not tick every second.
export function formatAgo(ms: number) {
  const minutes = Math.floor(Math.max(0, ms) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}
