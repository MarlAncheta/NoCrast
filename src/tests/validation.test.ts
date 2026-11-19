import { describe, expect, it } from 'vitest'
import { validateTask } from '../utils/validation'
import { fromDateTimeValue, toDateTimeValue } from '../utils/date'
import { resetTimer, elapsedMs } from '../utils/time'

const ok = { title: 'Write', description: '', category: '', priority: 'medium' as const, deadline: null }

describe('task validation', () => {
  it('trims and accepts a valid task', () => {
    const r = validateTask({ ...ok, title: '  Write  ' })
    expect(r.ok && r.value.title).toBe('Write')
  })
  it('rejects empty and overlong titles', () => {
    expect(validateTask({ ...ok, title: ' ' }).ok).toBe(false)
    expect(validateTask({ ...ok, title: 'x'.repeat(121) }).ok).toBe(false)
  })
  it('keeps the exact deadline time', () => {
    const ts = fromDateTimeValue('2026-11-20T14:30')!
    expect(new Date(ts).getHours()).toBe(14)
    expect(new Date(ts).getMinutes()).toBe(30)
    expect(toDateTimeValue(ts)).toBe('2026-11-20T14:30')
    expect(fromDateTimeValue('')).toBeNull()
  })
  it('resets elapsed time to zero', () => {
    const s = { sessionId: 's', taskId: 't', startedAt: 0, pausedAt: null, pausedTotal: 0 }
    expect(elapsedMs(resetTimer(s, 50_000), 50_000)).toBe(0)
  })
})
