import { useEffect, useState } from 'react'

export function useNow(enabled: boolean, ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [enabled, ms])
  return now
}
