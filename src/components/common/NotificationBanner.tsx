import { useState } from 'react'
import { useNotificationPermission } from '../../hooks/useNotificationPermission'
import { requestNotifications } from '../../services/notificationService'

const BTN = 'rounded-full bg-night px-4 py-1.5 font-bold text-snow focus-visible:outline-night'

// Reminds the user to allow desktop notifications, because that is what reaches them in other tabs and apps.
export function NotificationBanner({ enabled, onEnable }: { enabled: boolean; onEnable: () => void }) {
  const { perm, refresh } = useNotificationPermission()
  const [hidden, setHidden] = useState(false)
  if (perm === 'unsupported' || hidden || (perm === 'granted' && enabled)) return null
  const blocked = perm === 'denied'

  const enable = async () => {
    const ok = perm === 'granted' || (await requestNotifications())
    refresh()
    if (ok) onEnable()
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8">
      <section aria-label="Notification setup" className="mb-2 rounded-2xl bg-sun p-4 font-bold text-night">
        <p>
          {blocked
            ? "Desktop notifications are blocked for this site. Allow them in your browser's site settings to get deadline warnings in other tabs and apps."
            : 'Turn on desktop notifications to get deadline warnings when you are in another tab or another app.'}
        </p>
        <div className="mt-2 flex gap-2">
          {!blocked && (
            <button type="button" className={BTN} onClick={() => void enable()}>
              Turn on notifications
            </button>
          )}
          <button type="button" className={BTN} onClick={() => setHidden(true)}>
            Not now
          </button>
        </div>
      </section>
    </div>
  )
}
