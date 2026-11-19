import { useState, type ChangeEvent } from 'react'
import { DEFAULTS, sanitize, type Settings } from '../services/settings'
import { requestNotifications } from '../services/notificationService'
import { clearAll, exportData, importData } from '../services/dataService'
import { parseImport } from '../utils/importData'
import { SoundSettings } from '../components/settings/SoundSettings'
import { NumberSetting } from '../components/settings/NumberSetting'
import { Button } from '../components/common/Button'

type BoolKey = 'trackTabs' | 'notifications'

export function SettingsPage({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [msg, setMsg] = useState('')
  const set = (patch: Partial<Settings>) => onChange(sanitize({ ...settings, ...patch }))
  const check = (k: BoolKey, label: string) => (
    <label className="flex items-center gap-2">
      <input type="checkbox" className="size-5" checked={settings[k]} onChange={(e) => set({ [k]: e.target.checked })} />
      {label}
    </label>
  )

  const toggleNotifications = async (on: boolean) => {
    const ok = on ? await requestNotifications() : false
    if (on && !ok) setMsg('The browser blocked notifications, so they stay off.')
    set({ notifications: ok })
  }
  const doExport = async () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([await exportData()], { type: 'application/json' }))
    a.download = `nocrast-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const r = parseImport(await file.text())
    if (!r.ok) return setMsg(`Import failed: ${r.error} Nothing was changed.`)
    if (!window.confirm('Importing replaces your current tasks, sessions and events. Continue?')) return
    await importData(r.data)
    onChange(r.data.settings)
    setMsg(`Imported ${r.data.tasks.length} tasks and ${r.data.sessions.length} sessions.`)
  }
  const doClear = async () => {
    if (!window.confirm('Delete ALL NoCrast data in this browser? This cannot be undone.')) return
    await clearAll()
    onChange(DEFAULTS)
    setMsg('All local data deleted.')
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <h2 className="text-3xl font-black">Settings</h2>
      <section className="card space-y-4 bg-panel">
        <h3 className="text-xl font-black">Detection and alerts</h3>
        <NumberSetting
          id="inactivity"
          label="Inactivity threshold"
          description="No mouse or keyboard activity for this long is logged as possible inactivity."
          unit="minutes"
          min={1}
          max={60}
          value={settings.inactivityMin}
          onChange={(n) => set({ inactivityMin: n })}
        />
        <NumberSetting
          id="min-away"
          label="Ignore short tab switches"
          description="Tab switches shorter than this are treated as accidents and not logged."
          unit="seconds"
          min={1}
          max={300}
          value={settings.minAwaySec}
          onChange={(n) => set({ minAwaySec: n })}
        />
        {check('trackTabs', 'Log tab switches while you have open tasks')}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-5"
            checked={settings.notifications}
            onChange={(e) => void toggleNotifications(e.target.checked)}
          />
          Desktop notifications (deadline warnings and break end)
        </label>
      </section>
      <SoundSettings settings={settings} onChange={onChange} />
      <section className="card space-y-3 bg-raised">
        <h3 className="text-xl font-black">Your data</h3>
        <p>Everything stays in this browser. NoCrast sends nothing anywhere and watches only this tab, never other sites.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void doExport()}>Export JSON</Button>
          <label className="inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-night px-5 py-2.5 font-bold focus-within:outline-3">
            Import JSON
            <input type="file" accept="application/json" className="sr-only" onChange={(e) => void doImport(e)} />
          </label>
          <Button variant="danger" onClick={() => void doClear()}>
            Delete all data
          </Button>
        </div>
      </section>
      {msg && (
        <p role="status" className="rounded-2xl bg-sun p-3 font-bold text-night">
          {msg}
        </p>
      )}
    </main>
  )
}
