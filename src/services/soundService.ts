import { db } from './database'
import type { SoundMode } from './settings'
import { validateSoundFile } from '../utils/sound'

const ID = 'notification'
let cachedUrl: string | null = null
const resetCache = () => {
  if (cachedUrl) URL.revokeObjectURL(cachedUrl)
  cachedUrl = null
}

export async function getCustomSoundName() {
  return (await db.sounds.get(ID))?.name ?? null
}

// Returns an error message, or null when saved.
export async function saveCustomSound(file: File) {
  const err = validateSoundFile(file)
  if (err) return err
  await db.sounds.put({ id: ID, name: file.name, type: file.type, data: await file.arrayBuffer() })
  resetCache()
  return null
}

export async function removeCustomSound() {
  await db.sounds.delete(ID)
  resetCache()
}

async function customUrl() {
  if (cachedUrl) return cachedUrl
  const row = await db.sounds.get(ID)
  if (!row) return null
  cachedUrl = URL.createObjectURL(new Blob([row.data], { type: row.type }))
  return cachedUrl
}

function beep() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator()
    o.connect(c.destination)
    o.frequency.value = 660
    o.start()
    o.stop(c.currentTime + 0.25)
  } catch {
    /* audio unavailable */
  }
}

// 'system' and 'off' play nothing here: the system sound belongs to the desktop notification itself.
export async function playSound(mode: SoundMode) {
  if (mode === 'beep') return beep()
  if (mode !== 'custom') return
  try {
    const url = await customUrl()
    if (!url) return beep()
    await new Audio(url).play()
  } catch {
    beep()
  }
}
