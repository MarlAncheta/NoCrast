import { describe, expect, it } from 'vitest'
import { classifyAway, countsAsDistraction, isInactive } from '../utils/classify'

describe('classification', () => {
  it('splits short and extended interruptions', () => {
    expect(classifyAway(5_000)).toBe('short-interruption')
    expect(classifyAway(120_000)).toBe('extended-interruption')
  })
  it('flags inactivity only at the threshold', () => {
    expect(isInactive(0, 179_999, 180_000)).toBe(false)
    expect(isInactive(0, 180_000, 180_000)).toBe(true)
  })
  it('lets the user dismiss events', () => {
    expect(countsAsDistraction('unreviewed')).toBe(true)
    expect(countsAsDistraction('necessary')).toBe(false)
  })
})
