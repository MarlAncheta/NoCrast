export type EventKind = 'short-interruption' | 'extended-interruption' | 'inactivity'
export type Verdict = 'unreviewed' | 'productive' | 'necessary' | 'distraction'

export const SHORT_AWAY_MS = 30_000 // under this, a tab switch is a short interruption

export const classifyAway = (awayMs: number): EventKind => (awayMs < SHORT_AWAY_MS ? 'short-interruption' : 'extended-interruption')

export const isInactive = (lastActivity: number, now: number, thresholdMs: number) => now - lastActivity >= thresholdMs

// Only events the user hasn't dismissed count as distractions.
export const countsAsDistraction = (v: Verdict) => v === 'unreviewed' || v === 'distraction'

// Quick accidental tab switches shorter than the minimum are ignored, not logged or counted.
export const shouldLogAway = (awayMs: number, minMs: number) => awayMs >= minMs
