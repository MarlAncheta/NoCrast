import { describe, expect, it } from 'vitest'
import { appState, breakOverlapMs, finalizeBreak, plannedEndsAt, remainingMs, summarizeBreaks } from '../utils/breaks'
import type { BreakSession } from '../services/database'

const MIN = 60_000
const br = (o: Partial<BreakSession> = {}): BreakSession => ({
  id: 'b',
  type: 'short',
  startTime: 0,
  endTime: null,
  plannedDuration: 5 * MIN,
  actualDuration: 0,
  status: 'active',
  extensionCount: 0,
  ...o,
})

describe('break timing', () => {
  it('counts down from timestamps', () => {
    expect(remainingMs(br(), 2 * MIN)).toBe(3 * MIN)
    expect(remainingMs(br(), 99 * MIN)).toBe(0)
    expect(plannedEndsAt(br({ plannedDuration: 10 * MIN }))).toBe(10 * MIN)
  })
  it('ending early records the actual duration', () => {
    const r = finalizeBreak(br(), 'ended_early', 2 * MIN)
    expect(r).toMatchObject({ status: 'ended_early', actualDuration: 2 * MIN, endTime: 2 * MIN })
  })
  it('skipping is recorded as skipped', () => expect(finalizeBreak(br(), 'skipped', MIN).status).toBe('skipped'))
  it('expiry completes at the planned end even if noticed late', () => {
    const r = finalizeBreak(br(), 'expired', 50 * MIN)
    expect(r).toMatchObject({ status: 'completed', actualDuration: 5 * MIN })
  })
  it('ending after the planned time counts as completed', () =>
    expect(finalizeBreak(br(), 'ended_early', 9 * MIN).status).toBe('completed'))
})

describe('break accounting stays separate', () => {
  it('measures how much of a task span was on breaks', () => {
    const done = br({ startTime: 10 * MIN, endTime: 15 * MIN, actualDuration: 5 * MIN })
    expect(breakOverlapMs([done], 0, 60 * MIN, 0)).toBe(5 * MIN)
    expect(breakOverlapMs([done], 12 * MIN, 60 * MIN, 0)).toBe(3 * MIN)
    expect(breakOverlapMs([done], 20 * MIN, 60 * MIN, 0)).toBe(0)
  })
  it('counts a running break up to now', () => expect(breakOverlapMs([br()], 0, 60 * MIN, 2 * MIN)).toBe(2 * MIN))
  it('summarizes break outcomes', () => {
    const s = summarizeBreaks([
      br({ status: 'completed', actualDuration: 5 * MIN }),
      br({ status: 'skipped', actualDuration: MIN, extensionCount: 1 }),
      br({ status: 'ended_early', actualDuration: 3 * MIN }),
    ])
    expect(s).toMatchObject({ count: 3, totalMs: 9 * MIN, completed: 1, skipped: 1, endedEarly: 1, extended: 1 })
    expect(summarizeBreaks([]).avgMs).toBe(0)
  })
})

describe('app state', () => {
  it('suspends focus tracking only while breaking', () => {
    expect(appState(true, false)).toBe('FOCUSING')
    expect(appState(true, true)).toBe('BREAKING')
    expect(appState(true, false)).toBe('FOCUSING')
    expect(appState(false, false)).toBe('IDLE')
  })
})
