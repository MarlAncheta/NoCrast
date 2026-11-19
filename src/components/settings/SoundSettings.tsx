import { useEffect, useState, type ChangeEvent } from 'react'
import type { Settings, SoundMode } from '../../services/settings'
import { notificationPermission, notify } from '../../services/notificationService'
import { getCustomSoundName, playSound, removeCustomSound, saveCustomSound } from '../../services/soundService'
import { Button } from '../common/Button'

const FIELD = 'w-full rounded-xl border-2 border-snow/40 bg-night px-3 py-2 text-snow'
const MODES: [SoundMode, string][] = [
  ['system', 'System default (your computer’s notification sound)'],
  ['beep', 'Beep'],
  ['custom', 'My own sound'],
  ['off', 'No sound'],
]
const PERMISSION_TEXT = {
  granted: 'Allowed',
  denied: 'Blocked. Allow notifications for this site in your browser’s site settings.',
  default: 'Not asked yet. Use the button on the Today page, or send a test below.',
  unsupported: 'Not supported by this browser.',
}

export function SoundSettings({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [name, setName] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    void getCustomSoundName().then(setName)
  }, [])

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const err = await saveCustomSound(file)
    if (err) return setMsg(err)
    setName(file.name)
    setMsg(`Saved "${file.name}" as your notification sound.`)
    onChange({ ...settings, soundMode: 'custom' })
  }
  const remove = async () => {
    await removeCustomSound()
    setName(null)
    setMsg('Your sound was removed.')
    if (settings.soundMode === 'custom') onChange({ ...settings, soundMode: 'beep' })
  }
  const test = () => {
    notify('NoCrast test notification', 'This is how a deadline warning will look and sound.', settings, { tag: 'nocrast-test' })
    setMsg(
      notificationPermission() === 'granted'
        ? 'Test notification sent.'
        : 'Notifications are not allowed yet, so only the sound was played.',
    )
  }

  return (
    <section className="card space-y-3 bg-panel">
      <h3 className="text-xl font-black">Notification sound</h3>
      <p>Desktop notifications: {PERMISSION_TEXT[notificationPermission()]}</p>
      <label className="block">
        Notification sound
        <select
          className={FIELD}
          value={settings.soundMode}
          onChange={(e) => onChange({ ...settings, soundMode: e.target.value as SoundMode })}
        >
          {MODES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {settings.soundMode === 'custom' && (
        <div className="space-y-2">
          <p>{name ? `Current sound: ${name}` : 'No sound chosen yet, so a beep plays.'}</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-full bg-raised px-5 py-2.5 font-bold focus-within:outline-3">
              Choose a sound file
              <input type="file" accept="audio/*" className="sr-only" onChange={(e) => void pickFile(e)} />
            </label>
            {name && (
              <Button variant="secondary" onClick={() => void remove()}>
                Remove sound
              </Button>
            )}
          </div>
          <p className="text-sm">MP3, WAV or OGG, up to 2 MB. It plays while NoCrast is open in a tab.</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={test}>Send test notification</Button>
        <Button
          variant="secondary"
          onClick={() => void playSound(settings.soundMode)}
          disabled={settings.soundMode === 'system' || settings.soundMode === 'off'}
        >
          Play sound
        </Button>
      </div>
      {msg && (
        <p role="status" className="rounded-2xl bg-raised p-3 font-bold">
          {msg}
        </p>
      )}
    </section>
  )
}
