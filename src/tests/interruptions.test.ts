import { describe, expect, it } from 'vitest'
import { GROUP_GAP_MS, groupEvents, isVisible, VANISH_MS, visibleItems } from '../utils/interruptions'
import type { ActivityEvent } from '../services/database'
import type { EventKind, Verdict } from '../utils/classify'

const S = 1000
const MIN = 60 * S
const ev = (
  id: string,
  kind: EventKind,
  at: number,
  durationMs: number,
  verdict: Verdict = 'unreviewed',
  reviewedAt: number | null = null,
): ActivityEvent => ({
  id,
  sessionId: 't',
  kind,
  at,
  durationMs,
  verdict,
  reviewedAt,
})

describe('grouping interruptions', () => {
  it('groups consecutive short interruptions that follow each other closely', () => {
    const items = groupEvents([
      ev('a', 'short-interruption', 15 * S, 15 * S),
      ev('b', 'short-interruption', 40 * S, 15 * S),
      ev('c', 'short-interruption', 70 * S, 15 * S),
    ])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ type: 'group', kind: 'short-interruption', key: 'a' })
    expect(items[0].type === 'group' && items[0].events.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })
  it('does not group events more than the gap apart', () => {
    const items = groupEvents([
      ev('a', 'short-interruption', 15 * S, 15 * S),
      ev('b', 'short-interruption', 15 * S + GROUP_GAP_MS + 20 * S, 15 * S),
    ])
    expect(items.map((i) => i.type)).toEqual(['single', 'single'])
  })
  it('groups at exactly the gap but not a second beyond it', () => {
    const at = 10 * S
    expect(groupEvents([ev('a', 'inactivity', at, 5 * S), ev('b', 'inactivity', at + GROUP_GAP_MS + 5 * S, 5 * S)])[0].type).toBe('group')
    expect(groupEvents([ev('a', 'inactivity', at, 5 * S), ev('b', 'inactivity', at + GROUP_GAP_MS + 5 * S + 1, 5 * S)])).toHaveLength(2)
  })
  it('does not group across an event of another kind', () => {
    const items = groupEvents([
      ev('a', 'short-interruption', 15 * S, 15 * S),
      ev('x', 'extended-interruption', 100 * S, 60 * S),
      ev('b', 'short-interruption', 130 * S, 15 * S),
    ])
    expect(items.map((i) => i.type)).toEqual(['single', 'single', 'single'])
  })
  it('never groups extended interruptions', () => {
    const items = groupEvents([ev('a', 'extended-interruption', 60 * S, 40 * S), ev('b', 'extended-interruption', 120 * S, 40 * S)])
    expect(items.map((i) => i.type)).toEqual(['single', 'single'])
  })
  it('keeps short interruptions and inactivity apart', () => {
    const items = groupEvents([ev('a', 'short-interruption', 15 * S, 15 * S), ev('b', 'inactivity', 40 * S, 15 * S)])
    expect(items.map((i) => i.type)).toEqual(['single', 'single'])
  })
  it('puts events in time order whatever order they arrive in', () => {
    const items = groupEvents([ev('b', 'short-interruption', 40 * S, 15 * S), ev('a', 'short-interruption', 15 * S, 15 * S)])
    expect(items[0].type === 'group' && items[0].events.map((e) => e.id)).toEqual(['a', 'b'])
  })
})

describe('what is visible', () => {
  const now = 10 * MIN
  it('keeps unreviewed events and labeled ones for a minute', () => {
    expect(isVisible(ev('a', 'inactivity', 0, 0), now)).toBe(true)
    expect(isVisible(ev('a', 'inactivity', 0, 0, 'distraction', now - VANISH_MS + 1), now)).toBe(true)
    expect(isVisible(ev('a', 'inactivity', 0, 0, 'distraction', now - VANISH_MS), now)).toBe(false)
  })
  it('lists newest first', () => {
    const items = visibleItems(
      [ev('old', 'extended-interruption', 60 * S, 40 * S), ev('new', 'extended-interruption', 9 * MIN, 40 * S)],
      now,
    )
    expect(items.map((i) => (i.type === 'single' ? i.event.id : i.key))).toEqual(['new', 'old'])
  })
  it('a group left with one visible event becomes a single card, and an empty group disappears', () => {
    const gone = (id: string, at: number) => ev(id, 'short-interruption', at, 15 * S, 'productive', now - 5 * MIN)
    const one = visibleItems([gone('a', 15 * S), ev('b', 'short-interruption', 40 * S, 15 * S)], now)
    expect(one).toHaveLength(1)
    expect(one[0].type).toBe('single')
    expect(visibleItems([gone('a', 15 * S), gone('b', 40 * S)], now)).toHaveLength(0)
  })
  it('an expired event in the middle does not split its group', () => {
    const middle = ev('b', 'short-interruption', 40 * S, 15 * S, 'productive', now - 5 * MIN)
    const items = visibleItems([ev('a', 'short-interruption', 15 * S, 15 * S), middle, ev('c', 'short-interruption', 70 * S, 15 * S)], now)
    expect(items).toHaveLength(1)
    expect(items[0].type === 'group' && items[0].events.map((e) => e.id)).toEqual(['a', 'c'])
  })
})
