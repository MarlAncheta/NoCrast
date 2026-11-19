import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Session } from '../services/database'
import { bucketBreaks, bucketFocus, onTimeRate, periodStart, summarize, type Period } from '../services/analyticsService'
import { Button } from '../components/common/Button'
import { MinutesChart } from '../components/analytics/MinutesChart'
import { formatHMS } from '../utils/time'
import { breakOverlapMs, summarizeBreaks } from '../utils/breaks'

const PERIODS: Period[] = ['daily', 'weekly', 'monthly']
const num = (n: number | null, d = 1) => (n === null ? 'Not enough data' : n.toFixed(d))

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-inner bg-panel">
      <dt className="text-sm">{label}</dt>
      <dd className="text-2xl font-black">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-snow/70">{hint}</dd>}
    </div>
  )
}

export function Analytics() {
  const [period, setPeriod] = useState<Period>('weekly')
  const start = periodStart(period, Date.now())
  // A finished task counts as one block of time, placed at the moment it was finished.
  const allBreaks = useLiveQuery(() => db.breakSessions.toArray(), []) ?? []
  const finished = useLiveQuery(() => db.tasks.filter((t) => !!t.completedAt && t.completedAt >= start).toArray(), [start]) ?? []
  const sessions: Session[] = finished.map((t) => {
    const end = t.completedAt ?? t.createdAt
    return {
      id: t.id,
      taskId: t.id,
      startedAt: end,
      endedAt: end,
      focusMs: Math.max(0, end - t.createdAt - breakOverlapMs(allBreaks, t.createdAt, end, Date.now())),
    }
  })
  const events = useLiveQuery(() => db.events.where('at').aboveOrEqual(start).toArray(), [start]) ?? []
  const s = summarize(sessions, events)
  const onTime = onTimeRate(finished)
  const periodBreaks = allBreaks.filter((b) => b.startTime >= start && b.endTime !== null)
  const bs = summarizeBreaks(periodBreaks)
  const buckets = bucketFocus(sessions, period, Date.now())
  const breakBuckets = bucketBreaks(periodBreaks, period, Date.now())
  const chartData = buckets.map((b, i) => ({ label: b.label, tasks: b.minutes, breaks: breakBuckets[i].minutes }))
  const total = s.focusMs + s.interruptionMs + bs.totalMs
  const share = (ms: number) => (total ? (ms / total) * 100 : 0)

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <h2 className="text-3xl font-black">Analytics</h2>
      <div role="group" aria-label="Period" className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button key={p} variant={p === period ? 'primary' : 'secondary'} aria-pressed={p === period} onClick={() => setPeriod(p)}>
            {p}
          </Button>
        ))}
      </div>
      {s.sessions === 0 ? (
        <p className="card bg-raised">No finished tasks in this period yet. Mark one done and the numbers show up here.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Time on finished tasks" value={formatHMS(s.focusMs)} />
            <Stat label="Finished tasks" value={String(s.sessions)} />
            <Stat label="Average per task" value={formatHMS(s.avgMs ?? 0)} />
            <Stat
              label="On-time completion"
              value={onTime.rate === null ? 'No deadlines yet' : `${onTime.rate}%`}
              hint={
                onTime.rate === null
                  ? 'Add deadlines to tasks to see this.'
                  : `${onTime.onTime} of ${onTime.withDeadline} finished tasks with a deadline were done by it.`
              }
            />
            <Stat label="Distractions per task" value={num(s.perSession)} />
            <Stat label="Inactivity events" value={String(s.inactivity)} />
            <Stat label="Active days" value={`${s.activeDays} of ${period === 'daily' ? 1 : period === 'weekly' ? 7 : 30}`} />
            <Stat
              label="Peak finishing hour"
              value={s.bestHour === null ? 'Not enough data' : `${String(s.bestHour).padStart(2, '0')}:00`}
            />
          </dl>
          <section className="card bg-panel">
            <h3 className="mb-3 text-xl font-black">Task and break minutes {period === 'daily' ? 'by hour' : 'by day'}</h3>
            <MinutesChart buckets={chartData} unit={period === 'daily' ? 'hour' : 'day'} />
            <p className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded bg-blue" />
                Task time
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded bg-brand" />
                Break time
              </span>
            </p>
          </section>
          <section className="card bg-panel">
            <h3 className="mb-3 text-xl font-black">Focus, interruptions and breaks</h3>
            <div
              className="flex h-6 overflow-hidden rounded-full"
              role="img"
              aria-label={`Focus ${Math.round(share(s.focusMs))} percent, interruptions ${Math.round(share(s.interruptionMs))} percent, breaks ${Math.round(share(bs.totalMs))} percent`}
            >
              <div className="bg-blue" style={{ width: `${share(s.focusMs)}%` }} />
              <div className="bg-red" style={{ width: `${share(s.interruptionMs)}%` }} />
              <div className="bg-brand" style={{ width: `${share(bs.totalMs)}%` }} />
            </div>
            <p className="mt-2 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded bg-blue" />
                Focus {formatHMS(s.focusMs)}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded bg-red" />
                Interruptions {formatHMS(s.interruptionMs)}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded bg-brand" />
                Breaks {formatHMS(bs.totalMs)}
              </span>
            </p>
            <p className="mt-1 text-sm">Events you marked productive or necessary are excluded from interruptions.</p>
          </section>
        </>
      )}
      <section aria-label="Breaks" className="card bg-panel">
        <h3 className="mb-3 text-xl font-black">Breaks</h3>
        {bs.count === 0 ? (
          <p>No finished breaks in this period.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Breaks" value={String(bs.count)} />
            <Stat label="Total break time" value={formatHMS(bs.totalMs)} />
            <Stat label="Average break" value={formatHMS(bs.avgMs)} />
            <Stat label="Average planned" value={formatHMS(bs.avgPlannedMs)} />
            <Stat label="Completed" value={String(bs.completed)} />
            <Stat label="Skipped" value={String(bs.skipped)} />
            <Stat label="Ended early" value={String(bs.endedEarly)} />
            <Stat label="Extended" value={String(bs.extended)} />
          </dl>
        )}
        <p className="mt-3 text-sm">Break time is kept out of time on finished tasks and out of distraction counts.</p>
      </section>
    </main>
  )
}
