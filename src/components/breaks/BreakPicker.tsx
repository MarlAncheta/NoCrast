import { useState, type FormEvent } from 'react'
import type { BreakType } from '../../services/database'
import { MESSAGES } from '../../config/messages'
import { Button } from '../common/Button'

export interface BreakChoice {
  durationMs: number
  type: BreakType
}
const PRESETS = [5, 10, 15, 30]
const FIELD = 'w-24 rounded-xl border-2 border-snow/40 bg-night px-3 py-2 text-snow placeholder:text-snow/50'

export function BreakPicker({ onStart, onCancel }: { onStart: (c: BreakChoice) => void; onCancel: () => void }) {
  const [choice, setChoice] = useState<number | 'custom'>(5)
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const mins = choice === 'custom' ? Number(custom) : choice
    if (!Number.isInteger(mins) || mins < 1 || mins > 240) return setError('Pick a whole number of minutes from 1 to 240.')
    onStart({ durationMs: mins * 60_000, type: choice === 'custom' ? 'custom' : mins <= 10 ? 'short' : 'long' })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p>{MESSAGES.breakActive[0]} Pick how long, then confirm.</p>
      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold">How long?</legend>
        {PRESETS.map((m) => (
          <label key={m} className="flex items-center gap-2">
            <input type="radio" name="duration" className="size-5" checked={choice === m} onChange={() => setChoice(m)} />
            {m} minutes
          </label>
        ))}
        <label className="flex items-center gap-2">
          <input type="radio" name="duration" className="size-5" checked={choice === 'custom'} onChange={() => setChoice('custom')} />
          Custom
          <input
            aria-label="Custom minutes"
            placeholder="e.g. 20"
            className={FIELD}
            inputMode="numeric"
            value={custom}
            onFocus={() => setChoice('custom')}
            onChange={(e) => {
              setChoice('custom')
              setCustom(e.target.value)
            }}
          />
          minutes
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm font-bold text-red">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="blue">
          Start break
        </Button>
      </div>
    </form>
  )
}
