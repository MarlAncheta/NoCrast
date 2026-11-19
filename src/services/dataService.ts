import { db } from './database'
import { loadSettings, SETTINGS_KEY } from './settings'
import type { ImportData } from '../utils/importData'

export async function exportData() {
  const [tasks, sessions, events, breakSessions] = await Promise.all([
    db.tasks.toArray(),
    db.sessions.toArray(),
    db.events.toArray(),
    db.breakSessions.toArray(),
  ])
  return JSON.stringify(
    { app: 'nocrast', version: 1, exportedAt: Date.now(), tasks, sessions, events, breakSessions, settings: loadSettings() },
    null,
    2,
  )
}

export async function importData(d: ImportData) {
  await db.transaction('rw', db.tasks, db.sessions, db.events, db.breakSessions, async () => {
    await Promise.all([db.tasks.clear(), db.sessions.clear(), db.events.clear(), db.breakSessions.clear()])
    await db.tasks.bulkPut(d.tasks)
    await db.sessions.bulkPut(d.sessions)
    await db.events.bulkPut(d.events)
    await db.breakSessions.bulkPut(d.breakSessions)
  })
}

export async function clearAll() {
  await Promise.all([
    db.tasks.clear(),
    db.sessions.clear(),
    db.events.clear(),
    db.timer.clear(),
    db.breakSessions.clear(),
    db.sounds.clear(),
  ])
  localStorage.removeItem(SETTINGS_KEY)
}
