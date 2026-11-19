import { useState } from 'react'
import type { BreakSession } from '../../services/database'
import { MESSAGES, pick } from '../../config/messages'
import { remainingMs } from '../../utils/breaks'
import { formatHMS } from '../../utils/time'
import { Button } from '../common/Button'
import { ProgressBar } from '../common/ProgressBar'

interface Props {
  session: BreakSession
  now: number
  onExtend: (ms: number) => void
  onSkip: () => void
  onEnd: () => void
}
const FIELD = 'w-24 rounded-xl border-2 border-snow/40 bg-panel px-3 py-2 text-snow placeholder:text-snow/50'

// The break countdown is the main thing on screen during a break; the task timer is shown quietly beneath it.
export function BreakPanel({ session, now, onExtend, onSkip, onEnd }: Props) {
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')
  const remaining = remainingMs(session, now)
  const elapsed = Math.min(session.plannedDuration, Math.max(0, now - session.startTime))

  const extendCustom = () => {
    const m = Number(custom)
    if (!Number.isInteger(m) || m < 1 || m > 120) return setError('Extend by a whole number of minutes from 1 to 120.')
    setError('')
    setCustom('')
    onExtend(m * 60_000)
  }

  return (
    <div role="region" aria-label="Break mode" className="space-y-4">
      <p className="inline-block rounded-full bg-sun px-3 py-0.5 text-sm font-black text-night">BREAK MODE</p>
      <p className="text-lg font-bold">
        {remaining < 60_000 ? pick(MESSAGES.breakAlmost, session.startTime) : pick(MESSAGES.breakActive, session.startTime)}
      </p>
      <p data-testid="break-countdown" className="text-5xl font-black text-sun tabular-nums sm:text-7xl md:text-8xl">
        {formatHMS(remaining)}
      </p>
      <ProgressBar value={elapsed} max={session.plannedDuration} label="Break progress" />
      <p className="text-sm text-snow/80">
        On break for {formatHMS(elapsed)} of {formatHMS(session.plannedDuration)} planned
        {session.extensionCount > 0 && ` (extended ${session.extensionCount} time${session.extensionCount > 1 ? 's' : ''})`}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => onExtend(5 * 60_000)}>
          +5 min
        </Button>
        <Button variant="secondary" onClick={() => onExtend(10 * 60_000)}>
          +10 min
        </Button>
        <input
          aria-label="Custom extension (minutes)"
          placeholder="min"
          className={FIELD}
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <Button variant="secondary" onClick={extendCustom}>
          Extend
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-red">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onSkip}>
          Skip break
        </Button>
        <Button variant="blue" onClick={onEnd}>
          End break
        </Button>
      </div>
    </div>
  )
}
