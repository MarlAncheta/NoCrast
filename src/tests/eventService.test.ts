import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, type ActivityEvent } from '../services/database'
import { labelEvents } from '../services/eventService'

const ev = (id: string): ActivityEvent => ({
  id,
  sessionId: 't',
  kind: 'short-interruption',
  at: 1000,
  durationMs: 15_000,
  verdict: 'unreviewed',
  reviewedAt: null,
})
beforeEach(() => db.events.clear())

describe('bulk labeling', () => {
  it('labels exactly the chosen events and leaves the others alone', async () => {
    await db.events.bulkAdd([ev('a'), ev('b'), ev('c')])
    await labelEvents(['a', 'b'], 'distraction', 5000)
    expect(await db.events.get('a')).toMatchObject({ verdict: 'distraction', reviewedAt: 5000 })
    expect(await db.events.get('b')).toMatchObject({ verdict: 'distraction', reviewedAt: 5000 })
    expect(await db.events.get('c')).toMatchObject({ verdict: 'unreviewed', reviewedAt: null })
  })
  it('can relabel events and ignores ids that do not exist', async () => {
    await db.events.add(ev('a'))
    await labelEvents(['a'], 'productive', 1)
    await labelEvents(['a', 'missing'], 'necessary', 2)
    expect(await db.events.get('a')).toMatchObject({ verdict: 'necessary', reviewedAt: 2 })
    expect(await db.events.count()).toBe(1)
  })
})
