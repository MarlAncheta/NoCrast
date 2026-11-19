import type { ActivityEvent, BreakSession, Session, Task } from '../services/database'
import { sanitize, type Settings } from '../services/settings'

export interface ImportData {
  tasks: Task[]
  sessions: Session[]
  events: ActivityEvent[]
  breakSessions: BreakSession[]
  settings: Settings
}
type Rec = Record<string, unknown>
const isRecs = (v: unknown): v is Rec[] => Array.isArray(v) && v.every((x) => x && typeof x === 'object')

export function parseImport(text: string): { ok: true; data: ImportData } | { ok: false; error: string } {
  let j: Rec | null
  try {
    j = JSON.parse(text) as Rec | null
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  if (!j || j.app !== 'nocrast' || j.version !== 1) return { ok: false, error: 'This does not look like a NoCrast export.' }
  if (!isRecs(j.tasks) || !isRecs(j.sessions) || !isRecs(j.events))
    return { ok: false, error: 'The export is missing tasks, sessions or events.' }
  if (!j.tasks.every((t) => typeof t.id === 'string' && typeof t.title === 'string'))
    return { ok: false, error: 'Some tasks are malformed.' }
  if (!j.sessions.every((s) => typeof s.id === 'string' && typeof s.focusMs === 'number'))
    return { ok: false, error: 'Some sessions are malformed.' }
  if (!j.events.every((e) => typeof e.id === 'string')) return { ok: false, error: 'Some events are malformed.' }
  const rawBreaks = isRecs(j.breakSessions) ? j.breakSessions : []
  if (!rawBreaks.every((b) => typeof b.id === 'string' && typeof b.startTime === 'number'))
    return { ok: false, error: 'Some breaks are malformed.' }
  const tasks = j.tasks.map((t) => ({
    description: '',
    category: '',
    priority: 'medium',
    deadline: null,
    done: false,
    createdAt: 0,
    ...t,
  })) as Task[]
  return {
    ok: true,
    data: {
      tasks,
      sessions: j.sessions as unknown as Session[],
      events: j.events as unknown as ActivityEvent[],
      breakSessions: rawBreaks as unknown as BreakSession[],
      settings: sanitize(j.settings),
    },
  }
}
