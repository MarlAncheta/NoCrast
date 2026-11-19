import type { ActivityEvent } from '../services/database'
import type { EventKind } from './classify'

export const VANISH_MS = 60_000 // a labeled interruption leaves the list after this long
export const GROUP_GAP_MS = 5 * 60_000 // events this close together, of the same kind, are grouped

export const KIND_LABEL: Record<EventKind, string> = {
  'short-interruption': 'Short interruption',
  'extended-interruption': 'Extended interruption',
  inactivity: 'Possible inactivity',
}
export const GROUP_LABEL: Partial<Record<EventKind, string>> = {
  'short-interruption': 'short interruptions',
  inactivity: 'possible inactivity periods',
}

// Unreviewed events stay; labeled ones stay for a minute so a mislabel can be corrected.
export const isVisible = (e: ActivityEvent, now: number) => e.verdict === 'unreviewed' || now - (e.reviewedAt ?? 0) < VANISH_MS

export type EventItem = { type: 'single'; event: ActivityEvent } | { type: 'group'; key: string; kind: EventKind; events: ActivityEvent[] }

// Only short interruptions and inactivity are grouped, and only when the same kind follows the previous event
// closely with nothing of another kind in between. Extended interruptions always stand alone.
// Returns items oldest first.
export function groupEvents(events: ActivityEvent[], gapMs = GROUP_GAP_MS): EventItem[] {
  const items: EventItem[] = []
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const last = items[items.length - 1]
    if (last && (e.kind === 'short-interruption' || e.kind === 'inactivity')) {
      const prev = last.type === 'group' ? last.events[last.events.length - 1] : last.event
      const gap = e.at - e.durationMs - prev.at // from the end of the previous event to the start of this one
      if (prev.kind === e.kind && gap <= gapMs) {
        if (last.type === 'group') last.events.push(e)
        else items[items.length - 1] = { type: 'group', key: prev.id, kind: e.kind, events: [prev, e] }
        continue
      }
    }
    items.push({ type: 'single', event: e })
  }
  return items
}

// What to show now: the grouping is decided on all events (so it stays stable), then labeled events that have
// expired are dropped. A group left with one event becomes a single card. Newest first.
export function visibleItems(events: ActivityEvent[], now: number): EventItem[] {
  return groupEvents(events)
    .flatMap((item): EventItem[] => {
      if (item.type === 'single') return isVisible(item.event, now) ? [item] : []
      const shown = item.events.filter((e) => isVisible(e, now))
      if (shown.length === 0) return []
      if (shown.length === 1) return [{ type: 'single', event: shown[0] }]
      return [{ ...item, events: shown }]
    })
    .reverse()
}
