import type { ActivityEvent, BreakSession, Session, Task } from './database'
import { countsAsDistraction } from '../utils/classify'
import { startOfDay } from '../utils/time'

export type Period = 'daily' | 'weekly' | 'monthly'
const DAY = 86_400_000
const MIN_SESSIONS_FOR_INSIGHT = 3

export const periodStart = (p: Period, now: number) => startOfDay(now) - (p === 'daily' ? 0 : p === 'weekly' ? 6 : 29) * DAY

export interface Summary {
  focusMs: number
  sessions: number
  avgMs: number | null
  distractions: number
  inactivity: number
  perSession: number | null
  interruptionMs: number
  activeDays: number
  bestHour: number | null
}

export function summarize(sessions: Session[], events: ActivityEvent[]): Summary {
  const focusMs = sessions.reduce((n, s) => n + s.focusMs, 0)
  const bad = events.filter((e) => countsAsDistraction(e.verdict))
  const byHour = new Map<number, number>()
  sessions.forEach((s) => byHour.set(new Date(s.startedAt).getHours(), (byHour.get(new Date(s.startedAt).getHours()) ?? 0) + s.focusMs))
  const best = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    focusMs,
    sessions: sessions.length,
    avgMs: sessions.length ? focusMs / sessions.length : null,
    distractions: bad.length,
    inactivity: events.filter((e) => e.kind === 'inactivity').length,
    perSession: sessions.length ? bad.length / sessions.length : null,
    interruptionMs: bad.reduce((n, e) => n + e.durationMs, 0),
    activeDays: new Set(sessions.map((s) => startOfDay(s.startedAt))).size,
    bestHour: sessions.length >= MIN_SESSIONS_FOR_INSIGHT && best ? best[0] : null,
  }
}

export function bucketFocus(sessions: Session[], p: Period, now: number) {
  if (p === 'daily') {
    const b = Array.from({ length: 24 }, (_, h) => ({ label: String(h), minutes: 0 }))
    sessions.forEach((s) => {
      b[new Date(s.startedAt).getHours()].minutes += s.focusMs / 60000
    })
    return b.map((x) => ({ ...x, minutes: Math.round(x.minutes * 10) / 10 }))
  }
  const n = p === 'weekly' ? 7 : 30
  const start = startOfDay(now) - (n - 1) * DAY
  const b = Array.from({ length: n }, (_, i) => ({
    label: `${new Date(start + i * DAY).getMonth() + 1}/${new Date(start + i * DAY).getDate()}`,
    minutes: 0,
  }))
  sessions.forEach((s) => {
    const i = Math.floor((startOfDay(s.startedAt) - start) / DAY)
    if (i >= 0 && i < n) b[i].minutes += s.focusMs / 60000
  })
  return b.map((x) => ({ ...x, minutes: Math.round(x.minutes * 10) / 10 }))
}

// Break minutes per bucket, placed where the break started. Kept apart from task time on purpose.
export const bucketBreaks = (breaks: BreakSession[], p: Period, now: number) =>
  bucketFocus(
    breaks.map((b) => ({
      id: b.id,
      taskId: b.relatedTaskId ?? '',
      startedAt: b.startTime,
      endedAt: b.endTime ?? b.startTime,
      focusMs: b.actualDuration,
    })),
    p,
    now,
  )

type Dated = Task & { deadline: number; completedAt: number }
const hasDeadlineAndFinish = (t: Task): t is Dated => !!t.deadline && !!t.completedAt

// On-time completion: of the finished tasks that had a deadline, how many were finished on or before it.
// Tasks without a deadline are left out. With none to judge there is no rate, not a made-up one.
export function onTimeRate(finished: Task[]) {
  const dated = finished.filter(hasDeadlineAndFinish)
  const onTime = dated.filter((t) => t.completedAt <= t.deadline).length
  return { rate: dated.length ? Math.round((onTime / dated.length) * 100) : null, onTime, withDeadline: dated.length }
}
