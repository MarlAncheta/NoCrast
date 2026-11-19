import { describe, expect, it } from 'vitest'
import { labelStep, minutesText, niceMax } from '../utils/chart'
import { formatAgo } from '../utils/time'
import { onTimeRate } from '../services/analyticsService'
import type { Task } from '../services/database'

describe('chart helpers', () => {
  it('rounds the top of the chart up to an even, friendly number', () => {
    expect(niceMax(0)).toBe(2)
    expect(niceMax(1.5)).toBe(2)
    expect(niceMax(25)).toBe(30)
    expect(niceMax(40)).toBe(40)
    expect(niceMax(41)).toBe(60)
    expect(niceMax(1500)).toBe(1920)
    expect(niceMax(25) % 2).toBe(0) // so the middle gridline is a whole number
  })
  it('skips x-axis labels so they stay readable', () => {
    expect([labelStep(7), labelStep(14), labelStep(24), labelStep(30)]).toEqual([1, 2, 3, 5])
  })
  it('shows minutes without a trailing .0', () => {
    expect(minutesText(25)).toBe('25')
    expect(minutesText(2.5)).toBe('2.5')
    expect(minutesText(0.04)).toBe('0')
  })
})

describe('"created … ago" label', () => {
  const MIN = 60_000
  it('stays calm and coarse', () => {
    expect(formatAgo(5_000)).toBe('just now')
    expect(formatAgo(12 * MIN + 59_000)).toBe('12 min ago')
    expect(formatAgo(90 * MIN)).toBe('1 h ago')
    expect(formatAgo(26 * 60 * MIN)).toBe('1 day ago')
    expect(formatAgo(3 * 24 * 60 * MIN)).toBe('3 days ago')
    expect(formatAgo(-5)).toBe('just now')
  })
})

const t = (o: Partial<Task>): Task => ({
  id: 'x',
  title: 't',
  description: '',
  category: '',
  priority: 'medium',
  deadline: null,
  done: true,
  createdAt: 0,
  completedAt: null,
  ...o,
})
describe('on-time completion rate', () => {
  it('is not a number when no finished task had a deadline', () => {
    expect(onTimeRate([])).toEqual({ rate: null, onTime: 0, withDeadline: 0 })
    expect(onTimeRate([t({ completedAt: 5 })]).rate).toBeNull()
  })
  it('counts finishing exactly at the deadline as on time, and later as late', () => {
    const r = onTimeRate([
      t({ deadline: 100, completedAt: 100 }),
      t({ deadline: 100, completedAt: 99 }),
      t({ deadline: 100, completedAt: 101 }),
    ])
    expect(r).toEqual({ rate: 67, onTime: 2, withDeadline: 3 })
  })
  it('leaves out tasks with no deadline or no finish time', () => {
    const r = onTimeRate([t({ deadline: 100, completedAt: 50 }), t({ completedAt: 50 }), t({ deadline: 100, completedAt: null })])
    expect(r).toEqual({ rate: 100, onTime: 1, withDeadline: 1 })
  })
})
