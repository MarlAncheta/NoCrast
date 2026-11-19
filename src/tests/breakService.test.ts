import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../services/database'
import { endBreak, extendBreak, startBreak } from '../services/breakService'

const MIN = 60_000
beforeEach(async () => {
  await Promise.all([db.breakSessions.clear(), db.events.clear(), db.sessions.clear()])
})

describe('break service', () => {
  it('allows only one active break at a time', async () => {
    const first = await startBreak(5 * MIN, 'short', 't1', 0)
    expect(first?.status).toBe('active')
    expect(await startBreak(10 * MIN, 'long', 't1', 1000)).toBeNull()
    expect(await db.breakSessions.count()).toBe(1)
  })
  it('extends an active break and records it', async () => {
    const b = (await startBreak(5 * MIN, 'short', undefined, 0))!
    await extendBreak(b.id, 10 * MIN)
    expect(await db.breakSessions.get(b.id)).toMatchObject({ plannedDuration: 15 * MIN, extensionCount: 1 })
  })
  it('ends early, skips and expires with the right status', async () => {
    const a = (await startBreak(5 * MIN, 'short', undefined, 0))!
    await endBreak(a.id, 'ended_early', 2 * MIN)
    expect(await db.breakSessions.get(a.id)).toMatchObject({ status: 'ended_early', actualDuration: 2 * MIN })
    const b = (await startBreak(5 * MIN, 'short', undefined, 10 * MIN))!
    await endBreak(b.id, 'skipped', 11 * MIN)
    expect((await db.breakSessions.get(b.id))?.status).toBe('skipped')
    const c = (await startBreak(5 * MIN, 'short', undefined, 20 * MIN))!
    await endBreak(c.id, 'expired', 99 * MIN)
    expect(await db.breakSessions.get(c.id)).toMatchObject({ status: 'completed', actualDuration: 5 * MIN })
  })
  it('keeps history and ignores changes to a finished break', async () => {
    const b = (await startBreak(5 * MIN, 'short', undefined, 0))!
    await endBreak(b.id, 'ended_early', MIN)
    await extendBreak(b.id, 5 * MIN)
    await endBreak(b.id, 'skipped', 2 * MIN)
    expect(await db.breakSessions.get(b.id)).toMatchObject({ status: 'ended_early', extensionCount: 0 })
    expect(await startBreak(5 * MIN, 'short', undefined, 3 * MIN)).not.toBeNull()
  })
  it('never writes to distraction events or sessions', async () => {
    const b = (await startBreak(5 * MIN, 'short', undefined, 0))!
    await endBreak(b.id, 'expired', 5 * MIN)
    expect(await db.events.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
  })
})
