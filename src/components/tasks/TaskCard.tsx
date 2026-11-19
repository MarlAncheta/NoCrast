import type { Priority, Task } from '../../services/database'
import { APP_ICONS as I } from '../../config/icons'
import { formatDeadline } from '../../utils/date'
import { formatHMS } from '../../utils/time'
import { Button } from '../common/Button'

export type TaskStatus = 'active' | 'queued' | 'done'

// Priority is the thin colored edge: red urgent, amber high, blue low (medium is a neutral edge).
const EDGE: Record<Priority, string> = {
  urgent: 'border-l-red',
  high: 'border-l-amber',
  medium: 'border-l-snow/40',
  low: 'border-l-blue',
}
const PRIORITY_LABEL: Record<Priority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' }

interface Props {
  task: Task
  status: TaskStatus
  elapsedMs: number // shown live for the active task and fixed for a done task
  breakMs: number
  overdue: boolean
  ageText: string // a quiet "Created 12 min ago" for queued tasks, which do not tick
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}

// Three clearly different states: the ACTIVE task (the one being tracked, with a live timer and a blue outline),
// QUEUED tasks (open, quiet, no ticking clock) and DONE tasks (struck through, total time and finish time).
export function TaskCard({ task: t, status, elapsedMs, breakMs, overdue, ageText, onEdit, onToggle, onDelete }: Props) {
  const done = status === 'done'
  const tone = status === 'active' ? 'bg-raised ring-2 ring-blue' : done ? 'bg-raised/40' : ''
  return (
    <li data-status={status} className={`rounded-2xl border border-l-[3px] border-white/8 p-4 ${EDGE[t.priority]} ${tone}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {status === 'active' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-blue px-2.5 py-0.5 font-black text-snow">
            <span className="size-1.5 rounded-full bg-blue" aria-hidden />
            TRACKING NOW
          </span>
        )}
        {status === 'queued' && <span className="font-bold tracking-wide text-snow/70 uppercase">Queued</span>}
        {done && (
          <span className="inline-flex items-center gap-1 rounded-full bg-snow px-2.5 py-0.5 font-black text-night">
            <I.done size={12} aria-hidden />
            DONE
          </span>
        )}
        <span className="tracking-wide text-snow/70 uppercase">{PRIORITY_LABEL[t.priority]} priority</span>
        {overdue && <span className="font-black tracking-wide text-red">OVERDUE</span>}
      </div>
      <span className={`mt-1 block min-w-0 text-lg font-bold break-words ${done ? 'text-snow/70 line-through decoration-2' : ''}`}>
        {t.title}
      </span>
      {status === 'queued' ? (
        <p className="mt-2 text-sm text-snow/70">Created {ageText}</p>
      ) : (
        elapsedMs > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {done ? 'Total time' : 'Time on task'}
            <span className="text-xl font-black text-sun tabular-nums">{formatHMS(elapsedMs)}</span>
            {!done && <span className="font-bold">{overdue ? 'Overdue, still running' : 'running'}</span>}
          </p>
        )
      )}
      {breakMs > 0 && status !== 'queued' && (
        <p className="mt-1 text-sm">
          Of that, <span className="font-black text-sun tabular-nums">{formatHMS(breakMs)}</span> on breaks
        </p>
      )}
      {(t.category || t.deadline || t.description || (done && t.completedAt)) && (
        <p className="mt-1 text-sm text-snow/80">
          {[
            t.category,
            t.deadline ? `${overdue ? 'Was due' : 'Due'} ${formatDeadline(t.deadline)}` : '',
            done && t.completedAt ? `Finished ${formatDeadline(t.completedAt)}` : '',
          ]
            .filter(Boolean)
            .join(', ')}
          {t.description && <span className="block">{t.description}</span>}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={onEdit} aria-label={`Edit ${t.title}`}>
          Edit
        </Button>
        {done ? (
          <Button variant="secondary" onClick={onToggle} aria-label={`Reopen ${t.title}`}>
            Reopen
          </Button>
        ) : (
          <Button onClick={onToggle} aria-label={`Complete ${t.title}`}>
            <I.done size={16} aria-hidden />
            Mark done
          </Button>
        )}
        <Button variant="dangerGhost" onClick={onDelete} aria-label={`Delete ${t.title}`}>
          <I.remove size={16} aria-hidden />
        </Button>
      </div>
    </li>
  )
}
