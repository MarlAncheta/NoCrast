export type Page = 'today' | 'analytics' | 'settings'
export const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
]
