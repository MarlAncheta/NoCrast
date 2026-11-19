export type DeadlineLevel = 'early' | 'soon' | 'urgent' | 'overdue'
export interface Threshold {
  id: string
  ms: number // how long before the deadline the warning is due (0 = the deadline itself)
  level: DeadlineLevel
}

const M = 60_000
const H = 3_600_000
const D = 24 * H
// Ordered from furthest to nearest. A month is counted as 30 days.
export const THRESHOLDS: Threshold[] = [
  { id: '1mo', ms: 30 * D, level: 'early' },
  { id: '2w', ms: 14 * D, level: 'early' },
  { id: '1w', ms: 7 * D, level: 'early' },
  { id: '5d', ms: 5 * D, level: 'early' },
  { id: '3d', ms: 3 * D, level: 'early' },
  { id: '1d', ms: D, level: 'early' },
  { id: '5h', ms: 5 * H, level: 'early' },
  { id: '3h', ms: 3 * H, level: 'early' },
  { id: '1h', ms: H, level: 'soon' },
  { id: '30m', ms: 30 * M, level: 'soon' },
  { id: '10m', ms: 10 * M, level: 'urgent' },
  { id: '5m', ms: 5 * M, level: 'urgent' },
  { id: '1m', ms: M, level: 'urgent' },
  { id: 'overdue', ms: 0, level: 'overdue' },
]

// The warning to show now, or null. If several thresholds were passed at once (a task made with a close deadline,
// or the app was closed for a while) only the nearest one fires, and the older ones are marked as handled.
export function nextWarning(deadline: number, known: ReadonlySet<number>, now: number): { fire: Threshold; mark: number[] } | null {
  const crossed = THRESHOLDS.filter((t) => now >= deadline - t.ms && !known.has(t.ms))
  if (crossed.length === 0) return null
  return { fire: crossed[crossed.length - 1], mark: crossed.map((t) => t.ms) }
}
