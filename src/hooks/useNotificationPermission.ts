import { useEffect, useState } from 'react'
import { notificationPermission } from '../services/notificationService'

// Re-reads the browser permission when the user comes back to the page, in case they changed it in site settings.
export function useNotificationPermission() {
  const [perm, setPerm] = useState(notificationPermission)
  useEffect(() => {
    const refresh = () => setPerm(notificationPermission())
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  return { perm, refresh: () => setPerm(notificationPermission()) }
}
