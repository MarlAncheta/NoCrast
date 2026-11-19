import { db } from './database'
import type { Verdict } from '../utils/classify'

// Labels one or many interruptions in a single transaction, so a bulk action is all-or-nothing.
export function labelEvents(ids: string[], verdict: Verdict, now = Date.now()) {
  return db.transaction('rw', db.events, async () => {
    await Promise.all(ids.map((id) => db.events.update(id, { verdict, reviewedAt: now })))
  })
}
