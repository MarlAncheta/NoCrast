import { describe, expect, it } from 'vitest'
import { pickTracked } from '../utils/tracking'
import { shouldLogAway } from '../utils/classify'
import type { Task } from '../services/database'

const task = (id: string, o: Partial<Task> = {}): Task => ({
  id,
  title: id,
  description: '',
  category: '',
  priority: 'medium',
  deadline: null,
  done: false,
  createdAt: 0,
  ...o,
})

describe('pickTracked', () => {
  it('prefers the earliest deadline', () => {
    expect(pickTracked([task('late', { deadline: 200 }), task('soon', { deadline: 100 })])?.id).toBe('soon')
  })
  it('breaks a deadline tie by priority', () => {
    const r = pickTracked([
      task('low', { deadline: 100, priority: 'low' }),
      task('urgent', { deadline: 100, priority: 'urgent', createdAt: 5 }),
    ])
    expect(r?.id).toBe('urgent')
  })
  it('breaks a full tie by oldest, and puts no-deadline tasks last', () => {
    expect(pickTracked([task('new', { createdAt: 9 }), task('old', { createdAt: 1 })])?.id).toBe('old')
    expect(pickTracked([task('none'), task('dated', { deadline: 999 })])?.id).toBe('dated')
  })
  it('ignores finished tasks', () => {
    expect(pickTracked([task('done', { done: true, deadline: 1 })])).toBeUndefined()
  })
})

describe('accidental tab switches', () => {
  it('ignores switches under the minimum', () => {
    expect(shouldLogAway(3_000, 10_000)).toBe(false)
    expect(shouldLogAway(10_000, 10_000)).toBe(true)
  })
})
