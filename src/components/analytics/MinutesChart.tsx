import { useState } from 'react'
import { labelStep, minutesText, niceMax } from '../../utils/chart'

export interface ChartBucket {
  label: string
  tasks: number // minutes on finished tasks
  breaks: number // minutes on breaks
}

interface Props {
  buckets: ChartBucket[]
  unit: 'hour' | 'day'
}

// Task and break minutes per hour or day, with gridlines, labeled axes and a tooltip that gives the exact values
// on hover or keyboard focus.
export function MinutesChart({ buckets, unit }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const top = niceMax(Math.max(0, ...buckets.map((b) => Math.max(b.tasks, b.breaks))))
  const step = labelStep(buckets.length)
  // The tooltip hangs off the bar but is shifted so it always stays inside the chart, even on a phone.
  const tipPos = active === null ? 50 : ((active + 0.5) / buckets.length) * 100
  const show = (label: string) => (unit === 'hour' ? `${label}:00` : label)
  const text = (b: ChartBucket) => `${show(b.label)}: ${minutesText(b.tasks)} min on tasks, ${minutesText(b.breaks)} min on breaks`

  return (
    <div>
      <p className="mb-1 text-xs text-snow/70">Minutes</p>
      <div className="grid grid-cols-[2.5rem_1fr] gap-x-2">
        <div className="flex h-48 flex-col justify-between text-right text-xs text-snow/70 tabular-nums" aria-hidden>
          <span>{top}</span>
          <span>{top / 2}</span>
          <span>0</span>
        </div>
        <div className="relative h-48" onMouseLeave={() => setActive(null)}>
          {[0, 50, 100].map((p) => (
            <div key={p} aria-hidden className="absolute inset-x-0 border-t border-white/10" style={{ bottom: `${p}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-1">
            {buckets.map((b, i) => (
              <div
                key={b.label}
                role="img"
                tabIndex={0}
                data-testid="chart-bucket"
                aria-label={text(b)}
                className={`flex h-full flex-1 items-end gap-px rounded-sm ${active === i ? 'bg-white/10' : ''}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <div className="flex-1 rounded-t bg-blue" style={{ height: `${(b.tasks / top) * 100}%`, minHeight: b.tasks ? 3 : 0 }} />
                <div className="flex-1 rounded-t bg-brand" style={{ height: `${(b.breaks / top) * 100}%`, minHeight: b.breaks ? 3 : 0 }} />
              </div>
            ))}
          </div>
          {active !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-10 w-max max-w-full rounded-lg border border-white/15 bg-night px-3 py-1.5 text-sm font-bold shadow-lg"
              style={{ left: `${tipPos}%`, top: -6, transform: `translate(-${tipPos}%, -100%)` }}
            >
              {text(buckets[active])}
            </div>
          )}
        </div>
        <div />
        <div className="mt-1 flex gap-1" aria-hidden>
          {buckets.map((b, i) => (
            <span key={b.label} className="flex-1 text-center text-xs text-snow/70">
              {i % step === 0 ? show(b.label) : ''}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-snow/70">{unit === 'hour' ? 'Hour of day' : 'Date (month/day)'}</p>
    </div>
  )
}
