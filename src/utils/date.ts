const p = (n: number) => String(n).padStart(2, '0')

// Deadlines are exact local date and time, in the format <input type="datetime-local"> uses.
export const toDateTimeValue = (ts: number | null | undefined) => {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export const fromDateTimeValue = (v: string) => {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

export const formatDeadline = (ts: number) => new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
