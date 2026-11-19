import Dexie, { type Table } from 'dexie'
import type { TimerState } from '../utils/time'
import type { EventKind, Verdict } from '../utils/classify'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export interface Task {
  id: string
  title: string
  description: string
  category: string
  priority: Priority
  deadline: number | null
  done: boolean
  createdAt: number
  completedAt?: number | null
  warnedMs?: number[] // deadline warnings already shown
}
export type TaskInput = Pick<Task, 'title' | 'description' | 'category' | 'priority' | 'deadline'>
export interface Session {
  id: string
  taskId: string
  startedAt: number
  endedAt: number
  focusMs: number
}
export interface ActivityEvent {
  id: string
  sessionId: string
  kind: EventKind
  at: number
  durationMs: number
  verdict: Verdict
  reviewedAt?: number | null
}
type TimerRow = TimerState & { id: 1 }

export type BreakType = 'short' | 'long' | 'custom'
export interface BreakSession {
  id: string
  type: BreakType
  startTime: number
  endTime: number | null
  plannedDuration: number // total planned ms, including any extensions
  actualDuration: number
  status: 'active' | 'completed' | 'skipped' | 'ended_early'
  extensionCount: number
  relatedTaskId?: string
}

export interface SoundRow {
  id: string
  name: string
  type: string
  data: ArrayBuffer
}

class NoCrastDB extends Dexie {
  tasks!: Table<Task, string>
  sessions!: Table<Session, string>
  events!: Table<ActivityEvent, string>
  timer!: Table<TimerRow, number>
  breakSessions!: Table<BreakSession, string>
  sounds!: Table<SoundRow, string>
  constructor() {
    super('nocrast')
    this.version(1).stores({ tasks: 'id, done, createdAt', sessions: 'id, startedAt', events: 'id, at, sessionId', timer: 'id' })
    this.version(2).stores({ breaks: 'id, startedAt' })
    // v3 replaces the simple break records with full break sessions and carries old ones over.
    this.version(3)
      .stores({ breakSessions: 'id, startTime' })
      .upgrade(async (tx) => {
        const old = (await tx.table('breaks').toArray()) as { id: string; startedAt: number; endedAt: number | null }[]
        await tx.table('breakSessions').bulkAdd(
          old.map((b) => ({
            id: b.id,
            type: 'custom',
            startTime: b.startedAt,
            endTime: b.endedAt,
            plannedDuration: Math.max(300_000, (b.endedAt ?? b.startedAt) - b.startedAt),
            actualDuration: b.endedAt ? b.endedAt - b.startedAt : 0,
            status: b.endedAt ? 'ended_early' : 'active',
            extensionCount: 0,
          })),
        )
      })
    this.version(4).stores({ sounds: 'id' })
  }
}

export const db = new NoCrastDB()
export const uid = () => crypto.randomUUID()
