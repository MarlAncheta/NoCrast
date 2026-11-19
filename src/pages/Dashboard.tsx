import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid, type Task, type TaskInput } from '../services/database'
import type { Settings } from '../services/settings'
import { notify, requestNotifications } from '../services/notificationService'
import { endBreak, extendBreak, startBreak } from '../services/breakService'
import { labelEvents } from '../services/eventService'
import { APP_ICONS as I } from '../config/icons'
import { MESSAGES, pick } from '../config/messages'
import { Button } from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import { TaskForm } from '../components/tasks/TaskForm'
import { TaskCard } from '../components/tasks/TaskCard'
import { BreakPicker, type BreakChoice } from '../components/breaks/BreakPicker'
import { BreakPanel } from '../components/breaks/BreakPanel'
import { InterruptionsPanel } from '../components/interruptions/InterruptionsPanel'
import { useDistractionTracker } from '../hooks/useDistractionTracker'
import { useNow } from '../hooks/useNow'
import { formatAgo, formatHMS, startOfDay } from '../utils/time'
import { pickTracked } from '../utils/tracking'
import { appState, breakOverlapMs, plannedEndsAt } from '../utils/breaks'
import { countsAsDistraction } from '../utils/classify'
import { isVisible } from '../utils/interruptions'

export function Dashboard({ settings }: { settings: Settings }) {
  const tasks = useLiveQuery(() => db.tasks.orderBy('createdAt').reverse().toArray(), []) ?? []
  const events = useLiveQuery(() => db.events.where('at').aboveOrEqual(startOfDay(Date.now())).reverse().sortBy('at'), []) ?? []
  const activeBreak = useLiveQuery(() => db.breakSessions.filter((b) => b.endTime === null).first(), [])
  const allBreaks = useLiveQuery(() => db.breakSessions.toArray(), []) ?? []
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [picking, setPicking] = useState(false)

  const open = tasks.filter((t) => !t.done)
  const onBreak = !!activeBreak
  const renderTime = Date.now()
  // Only tick while something on screen needs a live clock.
  const now = useNow(open.length > 0 || onBreak || events.some((e) => e.verdict !== 'unreviewed' && isVisible(e, renderTime)))

  // Every task's clock runs from the moment it was created until it is marked done, deadline or not.
  // Only the tracked task shows it ticking; the others show a quiet "Created … ago".
  const taskMs = (t: Task) => Math.max(0, (t.done ? (t.completedAt ?? t.createdAt) : now) - t.createdAt)
  const taskBreakMs = (t: Task) => breakOverlapMs(allBreaks, t.createdAt, t.done ? (t.completedAt ?? t.createdAt) : now, now)
  const isOverdue = (t: Task) => !t.done && !!t.deadline && t.deadline < now
  const tracked = pickTracked(tasks)
  const state = appState(!!tracked, onBreak)

  // Distraction detection only runs while FOCUSING; a declared break suspends it and it restarts fresh afterwards.
  useDistractionTracker(
    tracked?.id ?? null,
    state === 'FOCUSING',
    settings.inactivityMin * 60_000,
    settings.trackTabs,
    settings.minAwaySec * 1000,
  )

  // The break ends itself when its time is up (also right after a refresh), without judging what comes next.
  const expired = useRef<string | null>(null)
  useEffect(() => {
    if (activeBreak && now >= plannedEndsAt(activeBreak) && expired.current !== activeBreak.id) {
      expired.current = activeBreak.id
      void endBreak(activeBreak.id, 'expired')
      notify('Break over', pick(MESSAGES.breakDone), settings)
    }
  }, [now, activeBreak, settings])

  const doneToday = tasks.filter((t) => t.done && t.completedAt && t.completedAt >= startOfDay(now)).length
  const overdue = open.filter(isOverdue).length
  const distractions = events.filter((e) => countsAsDistraction(e.verdict)).length
  const breaksToday = allBreaks.filter((b) => b.startTime >= startOfDay(now)).length

  const saveTask = async (values: TaskInput) => {
    // Asked on the Save click so the browser accepts the permission prompt.
    if (values.deadline) void requestNotifications()
    if (editing && editing !== 'new')
      await db.tasks.update(editing.id, values.deadline !== editing.deadline ? { ...values, warnedMs: [] } : values)
    else await db.tasks.add({ ...values, id: uid(), done: false, createdAt: Date.now(), completedAt: null, warnedMs: [] })
    setEditing(null)
  }
  // Reopening shifts the start forward by the time spent done, so that gap is not counted.
  const toggleDone = (t: Task) =>
    t.done
      ? db.tasks.update(t.id, { done: false, completedAt: null, createdAt: t.createdAt + (Date.now() - (t.completedAt ?? Date.now())) })
      : db.tasks.update(t.id, { done: true, completedAt: Date.now() })
  const doneTasks = tasks.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  const queued = open.filter((t) => t.id !== tracked?.id)
  const card = (t: Task) => (
    <TaskCard
      key={t.id}
      task={t}
      status={t.done ? 'done' : t.id === tracked?.id ? 'active' : 'queued'}
      elapsedMs={taskMs(t)}
      breakMs={taskBreakMs(t)}
      overdue={isOverdue(t)}
      ageText={formatAgo(now - t.createdAt)}
      onEdit={() => setEditing(t)}
      onToggle={() => void toggleDone(t)}
      onDelete={() => window.confirm(`Delete "${t.title}"?`) && db.tasks.delete(t.id)}
    />
  )
  const confirmBreak = async (c: BreakChoice) => {
    await startBreak(c.durationMs, c.type, tracked?.id)
    setPicking(false)
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1.2fr_1fr] md:p-8">
      <section aria-label="Timer" className="rounded-card border-4 border-blue bg-raised p-6 text-snow md:col-span-2">
        {activeBreak ? (
          <>
            <BreakPanel
              session={activeBreak}
              now={now}
              onExtend={(ms) => void extendBreak(activeBreak.id, ms)}
              onSkip={() => void endBreak(activeBreak.id, 'skipped')}
              onEnd={() => void endBreak(activeBreak.id, 'ended_early')}
            />
            <div className="mt-6 border-t border-white/10 pt-4 opacity-70">
              <p className="text-sm font-bold">{tracked ? `Task timer, still running: ${tracked.title}` : 'No open task'}</p>
              <p role="timer" aria-live="off" className="text-2xl font-bold text-sun tabular-nums">
                {formatHMS(tracked ? taskMs(tracked) : 0)}
              </p>
              {tracked && taskBreakMs(tracked) > 0 && (
                <p className="text-sm">
                  Includes <span className="font-bold tabular-nums">{formatHMS(taskBreakMs(tracked))}</span> on breaks
                </p>
              )}
              {tracked && isOverdue(tracked) && (
                <p className="mt-1 inline-block rounded-full bg-red px-2 text-xs font-black text-night">OVERDUE</p>
              )}
              <p className="mt-1 text-sm">Task timers keep running during a break. Nothing is judged until it ends.</p>
            </div>
          </>
        ) : (
          <>
            <p className="font-bold text-snow/75">{tracked ? `Now tracking: ${tracked.title}` : pick(MESSAGES.idleTimer)}</p>
            <p role="timer" aria-live="off" className="my-2 text-5xl font-black text-sun tabular-nums sm:text-7xl md:text-8xl">
              {formatHMS(tracked ? taskMs(tracked) : 0)}
            </p>
            {tracked && taskBreakMs(tracked) > 0 && (
              <p className="font-bold">
                Includes <span className="text-sun tabular-nums">{formatHMS(taskBreakMs(tracked))}</span> on breaks
              </p>
            )}
            {tracked && isOverdue(tracked) && <p className="inline-block rounded-full bg-red px-3 py-0.5 font-black text-night">OVERDUE</p>}
            <p className="text-snow/75">Each task&apos;s timer starts when you create it and stops only when you mark it done.</p>
            <div className="mt-4">
              <Button variant="blue" onClick={() => setPicking(true)}>
                Take a break
              </Button>
            </div>
          </>
        )}
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-snow/75">Open tasks</dt>
            <dd className="text-2xl font-black">{open.length}</dd>
          </div>
          <div>
            <dt className="text-snow/75">Overdue</dt>
            <dd className="text-2xl font-black">{overdue}</dd>
          </div>
          <div>
            <dt className="text-snow/75">Done today</dt>
            <dd className="text-2xl font-black">{doneToday}</dd>
          </div>
          <div>
            <dt className="text-snow/75">Distractions</dt>
            <dd className="text-2xl font-black">{distractions}</dd>
          </div>
          <div>
            <dt className="text-snow/75">Breaks today</dt>
            <dd className="text-2xl font-black">{breaksToday}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Tasks" className="card bg-panel">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Tasks</h2>
          <Button onClick={() => setEditing('new')}>
            <I.add size={18} />
            Add task
          </Button>
        </div>
        {tasks.length === 0 && <p>{pick(MESSAGES.emptyTasks)}</p>}
        <h3 className="mb-2 flex items-center gap-2 text-lg font-black">
          Open <span className="rounded-full border-2 border-snow px-2 text-sm">{open.length}</span>
        </h3>
        {open.length === 0 && tasks.length > 0 && <p className="mb-3">No open tasks.</p>}
        <ul className="space-y-3">{[...(tracked ? [tracked] : []), ...queued].map(card)}</ul>
        {doneTasks.length > 0 && (
          <>
            <h3 className="mt-6 mb-2 flex items-center gap-2 text-lg font-black">
              Done <span className="rounded-full bg-snow px-2 text-sm text-night">{doneTasks.length}</span>
            </h3>
            <ul className="space-y-3">{doneTasks.map(card)}</ul>
          </>
        )}
      </section>

      <Modal open={editing !== null} title={editing === 'new' ? 'New task' : 'Edit task'} onClose={() => setEditing(null)}>
        {editing && <TaskForm initial={editing === 'new' ? undefined : editing} onSave={saveTask} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={picking} title="Take a break" onClose={() => setPicking(false)}>
        {picking && <BreakPicker onStart={(c) => void confirmBreak(c)} onCancel={() => setPicking(false)} />}
      </Modal>

      <InterruptionsPanel
        events={events}
        now={renderTime}
        minAwaySec={settings.minAwaySec}
        onLabel={(ids, v) => void labelEvents(ids, v)}
      />
    </main>
  )
}
