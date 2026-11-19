import { db, uid, type BreakSession, type BreakType } from './database'
import { finalizeBreak, type BreakEnd } from '../utils/breaks'

const active = () => db.breakSessions.filter((b) => b.endTime === null).first()

// Returns null if a break is already running: only one can exist at a time.
export function startBreak(plannedMs: number, type: BreakType, relatedTaskId?: string, now = Date.now()): Promise<BreakSession | null> {
  return db.transaction('rw', db.breakSessions, async () => {
    if (await active()) return null
    const b: BreakSession = {
      id: uid(),
      type,
      startTime: now,
      endTime: null,
      plannedDuration: plannedMs,
      actualDuration: 0,
      status: 'active',
      extensionCount: 0,
      relatedTaskId,
    }
    await db.breakSessions.add(b)
    return b
  })
}

export function extendBreak(id: string, extraMs: number) {
  return db.transaction('rw', db.breakSessions, async () => {
    const b = await db.breakSessions.get(id)
    if (!b || b.endTime !== null || extraMs <= 0) return
    await db.breakSessions.put({ ...b, plannedDuration: b.plannedDuration + extraMs, extensionCount: b.extensionCount + 1 })
  })
}

export function endBreak(id: string, reason: BreakEnd, now = Date.now()) {
  return db.transaction('rw', db.breakSessions, async () => {
    const b = await db.breakSessions.get(id)
    if (!b || b.endTime !== null) return
    await db.breakSessions.put(finalizeBreak(b, reason, now))
  })
}
