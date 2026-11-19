import { describe, expect, it } from 'vitest'
import { bucketFocus, summarize } from '../services/analyticsService'
import { parseImport } from '../utils/importData'
import { sanitize, DEFAULTS } from '../services/settings'
import type { ActivityEvent, Session } from '../services/database'

const at = (h: number) => new Date(2026, 10, 12, h, 0, 0).getTime()
const sess = (h: number, min: number): Session => ({
  id: String(h),
  taskId: 't',
  startedAt: at(h),
  endedAt: at(h) + min * 60000,
  focusMs: min * 60000,
})
const ev = (verdict: ActivityEvent['verdict'], kind: ActivityEvent['kind'] = 'short-interruption'): ActivityEvent => ({
  id: Math.random().toString(),
  sessionId: 's',
  kind,
  at: at(9),
  durationMs: 10_000,
  verdict,
})

describe('analytics', () => {
  it('reports no insight with too little data', () => {
    const s = summarize([sess(9, 25)], [])
    expect(s.bestHour).toBeNull()
    expect(summarize([], []).avgMs).toBeNull()
  })
  it('finds the best hour and excludes dismissed events', () => {
    const s = summarize([sess(9, 25), sess(9, 25), sess(14, 10)], [ev('necessary'), ev('unreviewed'), ev('distraction', 'inactivity')])
    expect(s.bestHour).toBe(9)
    expect(s.distractions).toBe(2)
    expect(s.perSession).toBeCloseTo(2 / 3)
    expect(s.inactivity).toBe(1)
  })
  it('buckets focus minutes by hour and day', () => {
    expect(bucketFocus([sess(9, 25)], 'daily', at(12))[9].minutes).toBe(25)
    const w = bucketFocus([sess(9, 25)], 'weekly', at(12))
    expect(w).toHaveLength(7)
    expect(w[6].minutes).toBe(25)
  })
})

describe('settings and import', () => {
  it('clamps bad settings to safe values', () => {
    expect(sanitize({ focusMin: -5, inactivityMin: 'x', sound: true }).focusMin).toBe(1)
    expect(sanitize({ inactivityMin: 'x' }).inactivityMin).toBe(DEFAULTS.inactivityMin)
    expect(sanitize(null)).toEqual(DEFAULTS)
  })
  it('rejects invalid imports without throwing', () => {
    expect(parseImport('nope').ok).toBe(false)
    expect(parseImport('{"app":"other"}').ok).toBe(false)
    expect(parseImport('{"app":"nocrast","version":1,"tasks":[{"id":1}],"sessions":[],"events":[]}').ok).toBe(false)
  })
  it('accepts a valid export and fills task defaults', () => {
    const r = parseImport(JSON.stringify({ app: 'nocrast', version: 1, tasks: [{ id: 'a', title: 'x' }], sessions: [], events: [] }))
    expect(r.ok && r.data.tasks[0].priority).toBe('medium')
  })
})
