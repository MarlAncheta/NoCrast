import { lazy, Suspense, useState } from 'react'
import { Dashboard } from './pages/Dashboard'
import { NAV_ITEMS, type Page } from './config/navigation'
import { loadSettings, saveSettings, type Settings } from './services/settings'
import { ToastStack } from './components/common/ToastStack'
import { useDeadlineWarnings } from './hooks/useDeadlineWarnings'
import { NotificationBanner } from './components/common/NotificationBanner'
import { Button } from './components/common/Button'

const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })))
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })))

export function App() {
  const [page, setPage] = useState<Page>('today')
  const [settings, setSettings] = useState(loadSettings)
  const { toasts, dismiss, dismissAll } = useDeadlineWarnings(settings)
  const update = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} onDismissAll={dismissAll} />
      <nav aria-label="Main" className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 p-4 md:px-8">
        <h1 className="mr-auto text-4xl font-black">NoCrast</h1>
        {NAV_ITEMS.map((n) => (
          <Button
            key={n.id}
            variant={page === n.id ? 'primary' : 'secondary'}
            aria-current={page === n.id ? 'page' : undefined}
            onClick={() => setPage(n.id)}
          >
            {n.label}
          </Button>
        ))}
      </nav>
      <NotificationBanner enabled={settings.notifications} onEnable={() => update({ ...settings, notifications: true })} />
      {/* Kept mounted so the timer and distraction tracking keep running on other pages. */}
      <div hidden={page !== 'today'}>
        <Dashboard settings={settings} />
      </div>
      <Suspense fallback={null}>
        {page === 'analytics' && <Analytics />}
        {page === 'settings' && <SettingsPage settings={settings} onChange={update} />}
      </Suspense>
    </>
  )
}
