import { useEffect, useState } from 'react'

// A clock that keeps ticking at full speed when the tab is in the background. Browsers slow normal timers in
// hidden tabs (down to once a minute), but a Web Worker's timer is not slowed, so warnings arrive on time.
export function useTick(enabled: boolean, ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!enabled) return
    let worker: Worker | null = null
    let fallback: number | undefined
    const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms})`], { type: 'text/javascript' }))
    try {
      worker = new Worker(url)
      worker.onmessage = () => setNow(Date.now())
    } catch {
      fallback = window.setInterval(() => setNow(Date.now()), ms)
    }
    return () => {
      worker?.terminate()
      URL.revokeObjectURL(url)
      if (fallback !== undefined) clearInterval(fallback)
    }
  }, [enabled, ms])
  return now
}
