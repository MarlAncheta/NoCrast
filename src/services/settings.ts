export type SoundMode = 'system' | 'beep' | 'custom' | 'off'
const SOUND_MODES: SoundMode[] = ['system', 'beep', 'custom', 'off']

export interface Settings {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  inactivityMin: number
  trackTabs: boolean
  soundMode: SoundMode
  notifications: boolean
  minAwaySec: number
}
export const DEFAULTS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  inactivityMin: 3,
  trackTabs: true,
  soundMode: 'system',
  notifications: true,
  minAwaySec: 10,
}
export const SETTINGS_KEY = 'nocrast.settings'

const clamp = (n: unknown, min: number, max: number, d: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d

export function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const mode = SOUND_MODES.find((m) => m === r.soundMode)
  return {
    focusMin: clamp(r.focusMin, 1, 240, DEFAULTS.focusMin),
    shortBreakMin: clamp(r.shortBreakMin, 1, 60, DEFAULTS.shortBreakMin),
    longBreakMin: clamp(r.longBreakMin, 1, 120, DEFAULTS.longBreakMin),
    inactivityMin: clamp(r.inactivityMin, 1, 60, DEFAULTS.inactivityMin),
    trackTabs: r.trackTabs !== false,
    // Older versions stored a plain on/off `sound`; on meant the beep.
    soundMode: mode ?? (r.sound === true ? 'beep' : DEFAULTS.soundMode),
    notifications: r.notifications !== false,
    minAwaySec: clamp(r.minAwaySec, 1, 300, DEFAULTS.minAwaySec),
  }
}

export const loadSettings = (): Settings => {
  try {
    return sanitize(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null'))
  } catch {
    return DEFAULTS
  }
}
export const saveSettings = (s: Settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: settings last for this visit only */
  }
}
