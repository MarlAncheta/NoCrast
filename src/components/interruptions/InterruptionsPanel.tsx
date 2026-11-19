import { useState } from 'react'
import type { ActivityEvent } from '../../services/database'
import type { Verdict } from '../../utils/classify'
import { GROUP_LABEL, KIND_LABEL, VANISH_MS, visibleItems, type EventItem } from '../../utils/interruptions'
import { formatHMS } from '../../utils/time'
import { Button } from '../common/Button'

const VERDICTS: [Verdict, string][] = [
  ['productive', 'Productive'],
  ['necessary', 'Necessary'],
  ['distraction', 'Distraction'],
]
const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const clearsIn = (e: ActivityEvent, now: number) => Math.max(0, Math.ceil((VANISH_MS - (now - (e.reviewedAt ?? 0))) / 1000))

interface Props {
  events: ActivityEvent[] // all of today's events; this component decides what to show and how to group it
  now: number
  minAwaySec: number
  onLabel: (ids: string[], verdict: Verdict) => void
}

function EventCard({ e, now, onLabel }: { e: ActivityEvent; now: number; onLabel: Props['onLabel'] }) {
  return (
    <li className="card-inner bg-panel p-3">
      <p className="font-bold">
        {KIND_LABEL[e.kind]} · {formatHMS(e.durationMs)} · {new Date(e.at).toLocaleTimeString()}
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Classify this event">
        {VERDICTS.map(([v, label]) => (
          <Button
            key={v}
            variant={e.verdict === v ? 'primary' : 'secondary'}
            aria-pressed={e.verdict === v}
            onClick={() => onLabel([e.id], v)}
          >
            {label}
          </Button>
        ))}
      </div>
      {e.verdict !== 'unreviewed' && <p className="mt-2 text-sm text-snow/75">Clears in {clearsIn(e, now)}s</p>}
    </li>
  )
}

function GroupCard({ item, now, onLabel }: { item: Extract<EventItem, { type: 'group' }>; now: number; onLabel: Props['onLabel'] }) {
  const [open, setOpen] = useState(false)
  const { events } = item
  const ids = events.map((e) => e.id)
  const count = (v: Verdict) => events.filter((e) => e.verdict === v).length
  const summary = (['unreviewed', 'productive', 'necessary', 'distraction'] as Verdict[])
    .filter((v) => count(v) > 0)
    .map((v) => `${count(v)} ${v}`)
    .join(', ')
  const allLabeled = events.every((e) => e.verdict !== 'unreviewed')
  const first = events[0]
  const last = events[events.length - 1]
  const title = `${events.length} ${GROUP_LABEL[item.kind] ?? 'interruptions'}`

  return (
    <li className="card-inner bg-panel p-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-lg text-left"
      >
        <span>
          <span className="block font-bold">{title}</span>
          <span className="block text-sm text-snow/75">
            {formatHMS(events.reduce((n, e) => n + e.durationMs, 0))} in total · {clock(first.at - first.durationMs)} to {clock(last.at)}
          </span>
        </span>
        <span aria-hidden className="text-lg">
          {open ? '▾' : '▸'}
        </span>
      </button>
      <p className="mt-1 text-sm text-snow/75">
        {summary}
        {allLabeled && ` · clears in ${Math.max(...events.map((e) => clearsIn(e, now)))}s`}
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Classify all ${title}`}>
        <Button variant="danger" onClick={() => onLabel(ids, 'distraction')}>
          Mark all as Distraction
        </Button>
        <Button variant="secondary" onClick={() => onLabel(ids, 'productive')}>
          Mark all as Productive
        </Button>
        <Button variant="secondary" onClick={() => onLabel(ids, 'necessary')}>
          Mark all as Necessary
        </Button>
      </div>
      {open && (
        <ul className="mt-3 space-y-2">
          {[...events].reverse().map((e) => (
            <EventCard key={e.id} e={e} now={now} onLabel={onLabel} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function InterruptionsPanel({ events, now, minAwaySec, onLabel }: Props) {
  const items = visibleItems(events, now)
  return (
    <section aria-label="Interruptions" className="card bg-raised">
      <h2 className="mb-3 text-2xl font-black">Interruptions today</h2>
      {items.length === 0 && (
        <p>
          Nothing to review. Tab switches longer than {minAwaySec} seconds and long idle stretches show up here. Close ones of the same kind
          are grouped. Labeled ones clear after a minute.
        </p>
      )}
      <ul className="space-y-3">
        {items.map((item) =>
          item.type === 'single' ? (
            <EventCard key={item.event.id} e={item.event} now={now} onLabel={onLabel} />
          ) : (
            <GroupCard key={item.key} item={item} now={now} onLabel={onLabel} />
          ),
        )}
      </ul>
    </section>
  )
}
