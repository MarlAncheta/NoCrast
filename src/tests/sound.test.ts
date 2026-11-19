import { describe, expect, it } from 'vitest'
import { MAX_SOUND_BYTES, validateSoundFile } from '../utils/sound'
import { DEFAULTS, sanitize } from '../services/settings'

describe('custom sound files', () => {
  it('accepts a small audio file', () => expect(validateSoundFile({ size: 5000, type: 'audio/mpeg' })).toBeNull())
  it('rejects non-audio files', () => expect(validateSoundFile({ size: 5000, type: 'image/png' })).toMatch(/audio/i))
  it('rejects files over 2 MB', () => {
    expect(validateSoundFile({ size: MAX_SOUND_BYTES, type: 'audio/wav' })).toBeNull()
    expect(validateSoundFile({ size: MAX_SOUND_BYTES + 1, type: 'audio/wav' })).toMatch(/2 MB/)
  })
})

describe('sound and notification settings', () => {
  it('defaults to the system sound with notifications on', () => {
    expect(DEFAULTS.soundMode).toBe('system')
    expect(sanitize(undefined).notifications).toBe(true)
  })
  it('keeps a valid sound mode and rejects an unknown one', () => {
    expect(sanitize({ soundMode: 'custom' }).soundMode).toBe('custom')
    expect(sanitize({ soundMode: 'loud' }).soundMode).toBe('system')
  })
  it('turns an old "sound on" setting into the beep', () => {
    expect(sanitize({ sound: true }).soundMode).toBe('beep')
    expect(sanitize({ sound: false }).soundMode).toBe('system')
  })
  it('respects notifications turned off', () => expect(sanitize({ notifications: false }).notifications).toBe(false))
})
