import { describe, expect, it } from 'vitest'
import { elapsedMs, formatHMS, pauseTimer, resumeTimer, type TimerState } from '../utils/time'

const base: TimerState = { sessionId: 's', taskId: 't', startedAt: 1000, pausedAt: null, pausedTotal: 0 }

describe('timer', () => {
  it('computes elapsed from timestamps', () => expect(elapsedMs(base, 61_000)).toBe(60_000))
  it('freezes while paused', () => {
    const p = pauseTimer(base, 11_000)
    expect(elapsedMs(p, 999_999)).toBe(10_000)
  })
  it('excludes paused time after resume', () => {
    const r = resumeTimer(pauseTimer(base, 11_000), 31_000)
    expect(elapsedMs(r, 41_000)).toBe(20_000)
  })
  it('survives a long background gap', () => expect(elapsedMs(base, 1000 + 3_600_000)).toBe(3_600_000))
  it('formats HH:MM:SS', () => expect(formatHMS(3_725_000)).toBe('01:02:05'))
})
