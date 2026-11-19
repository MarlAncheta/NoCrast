import type { BreakSession } from '../services/database'

export type AppState = 'IDLE' | 'FOCUSING' | 'BREAKING'

// Task timers never pause, so there is no paused-focus state: you are idle, focusing, or on a declared break.
export const appState = (hasOpenTask: boolean, onBreak: boolean): AppState => (onBreak ? 'BREAKING' : hasOpenTask ? 'FOCUSING' : 'IDLE')

export const plannedEndsAt = (b: BreakSession) => b.startTime + b.plannedDuration
export const remainingMs = (b: BreakSession, now: number) => Math.max(0, plannedEndsAt(b) - now)

export type BreakEnd = 'expired' | 'ended_early' | 'skipped'

// Timestamps decide everything, so a break that ran out while the app was closed still ends at its planned time.
export function finalizeBreak(b: BreakSession, reason: BreakEnd, now: number): BreakSession {
  const end = reason === 'expired' ? plannedEndsAt(b) : Math.min(now, plannedEndsAt(b))
  const status = reason === 'skipped' ? 'skipped' : end >= plannedEndsAt(b) ? 'completed' : 'ended_early'
  return { ...b, endTime: end, actualDuration: Math.max(0, end - b.startTime), status }
}

// How much of [from, to] was spent on declared breaks. An unfinished break counts up to now (or its planned end).
export function breakOverlapMs(breaks: BreakSession[], from: number, to: number, now: number) {
  return breaks.reduce((n, b) => {
    const end = b.endTime ?? Math.min(now, plannedEndsAt(b))
    return n + Math.max(0, Math.min(end, to) - Math.max(b.startTime, from))
  }, 0)
}

export function summarizeBreaks(list: BreakSession[]) {
  const count = list.length
  const totalMs = list.reduce((n, b) => n + b.actualDuration, 0)
  const planned = list.reduce((n, b) => n + b.plannedDuration, 0)
  return {
    count,
    totalMs,
    avgMs: count ? totalMs / count : 0,
    avgPlannedMs: count ? planned / count : 0,
    completed: list.filter((b) => b.status === 'completed').length,
    skipped: list.filter((b) => b.status === 'skipped').length,
    endedEarly: list.filter((b) => b.status === 'ended_early').length,
    extended: list.filter((b) => b.extensionCount > 0).length,
  }
}
