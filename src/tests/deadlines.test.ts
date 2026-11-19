import { describe, expect, it } from 'vitest'
import { THRESHOLDS, nextWarning } from '../utils/deadlines'

const M = 60_000
const H = 3_600_000
const DAY = 24 * H
const D = 100 * DAY // an arbitrary deadline
const none = new Set<number>()
const ms = (id: string) => THRESHOLDS.find((t) => t.id === id)!.ms
// Everything up to and including `id` already shown.
const upTo = (id: string) => new Set(THRESHOLDS.slice(0, THRESHOLDS.findIndex((t) => t.id === id) + 1).map((t) => t.ms))

describe('deadline warnings', () => {
  it('has the requested stages in order', () => {
    expect(THRESHOLDS.map((t) => t.id)).toEqual([
      '1mo',
      '2w',
      '1w',
      '5d',
      '3d',
      '1d',
      '5h',
      '3h',
      '1h',
      '30m',
      '10m',
      '5m',
      '1m',
      'overdue',
    ])
    expect(ms('1mo')).toBe(30 * DAY)
    expect(ms('1w')).toBe(7 * DAY)
  })
  it('stays quiet before a month out', () => expect(nextWarning(D, none, D - 30 * DAY - 1000)).toBeNull())
  it('fires the first warning at one month', () => expect(nextWarning(D, none, D - 30 * DAY)?.fire.id).toBe('1mo'))
  it('fires each stage as it is reached, one after another', () => {
    const steps: [string, string, number][] = [
      ['1mo', '2w', 14 * DAY],
      ['2w', '1w', 7 * DAY],
      ['1w', '5d', 5 * DAY],
      ['5d', '3d', 3 * DAY],
      ['3d', '1d', DAY],
      ['1d', '5h', 5 * H],
      ['5h', '3h', 3 * H],
      ['3h', '1h', H],
      ['1h', '30m', 30 * M],
      ['30m', '10m', 10 * M],
      ['10m', '5m', 5 * M],
      ['5m', '1m', M],
    ]
    for (const [before, next, left] of steps) expect(nextWarning(D, upTo(before), D - left)?.fire.id).toBe(next)
  })
  it('shows only the nearest warning when several were passed at once', () => {
    const w = nextWarning(D, none, D - 20 * M)
    expect(w?.fire.id).toBe('30m')
    expect(w?.mark).toHaveLength(THRESHOLDS.findIndex((t) => t.id === '30m') + 1)
    expect(nextWarning(D, new Set(w?.mark), D - 20 * M)).toBeNull()
  })
  it('a task due in 2 days only gets the nearest passed warning, not the older ones', () => {
    expect(nextWarning(D, none, D - 2 * DAY)?.fire.id).toBe('3d')
  })
  it('skips a missed 5 minute warning', () => {
    const w = nextWarning(D, upTo('10m'), D - 59_000)
    expect(w?.fire.id).toBe('1m')
    expect(w?.mark).toEqual([5 * M, M])
  })
  it('fires overdue once the deadline passes and never repeats', () => {
    expect(nextWarning(D, upTo('1m'), D)?.fire).toMatchObject({ id: 'overdue', level: 'overdue' })
    expect(nextWarning(D, new Set(THRESHOLDS.map((t) => t.ms)), D + 10 * H)).toBeNull()
  })
})
