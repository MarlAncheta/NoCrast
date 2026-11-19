import type { Settings } from './settings'
import { playSound } from './soundService'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window
export const notificationPermission = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported'

export async function requestNotifications() {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export interface NotifyOptions {
  persist?: boolean // stay on screen until dismissed (where the system allows it)
  tag?: string // a repeat with the same tag replaces the earlier one
}

// A real desktop notification, which shows even when you are in another tab or another application,
// as long as the browser is running and this page is still open. Falls back to the sound alone.
export function notify(title: string, body: string, s: Pick<Settings, 'soundMode' | 'notifications'>, opts: NotifyOptions = {}) {
  let shown = false
  if (s.notifications && notificationPermission() === 'granted') {
    try {
      const n = new Notification(title, { body, tag: opts.tag, requireInteraction: opts.persist, silent: s.soundMode !== 'system' })
      n.onclick = () => {
        window.focus()
        n.close()
      }
      shown = true
    } catch {
      /* some browsers only allow notifications through a service worker */
    }
  }
  // With no notification to carry the system sound, a beep stands in for it.
  void playSound(s.soundMode === 'system' && !shown ? 'beep' : s.soundMode)
}
