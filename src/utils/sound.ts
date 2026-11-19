export const MAX_SOUND_BYTES = 2 * 1024 * 1024

// Returns a message if the file cannot be used as a notification sound.
export const validateSoundFile = (f: { size: number; type: string }) =>
  !f.type.startsWith('audio/')
    ? 'Choose an audio file (MP3, WAV, OGG or similar).'
    : f.size > MAX_SOUND_BYTES
      ? 'That file is over 2 MB. Pick a shorter sound.'
      : null
