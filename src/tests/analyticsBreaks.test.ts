import { describe, expect, it } from 'vitest'
import { bucketBreaks } from '../services/analyticsService'
import type { BreakSession } from '../services/database'

const at = (h: number, m = 0) => new Date(2026, 10, 12, h, m).getTime()
const br = (startTime: number, actualDuration: number): BreakSession => ({
  id: String(startTime),
  type: 'short',
  startTime,
  endTime: startTime + actualDuration,
  plannedDuration: actualDuration,
  actualDuration,
  status: 'completed',
  extensionCount: 0,
})

describe('break buckets', () => {
  it('places break minutes in the hour they started, including short ones', () => {
    const b = bucketBreaks([br(at(9), 5 * 60_000), br(at(9, 30), 30_000)], 'daily', at(12))
    expect(b[9].minutes).toBe(5.5)
    expect(b[10].minutes).toBe(0)
  })
  it('buckets by day for the weekly view', () => {
    const w = bucketBreaks([br(at(9), 10 * 60_000)], 'weekly', at(12))
    expect(w).toHaveLength(7)
    expect(w[6].minutes).toBe(10)
  })
})
