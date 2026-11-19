interface Props {
  value: number
  max: number
  label: string
}

export function ProgressBar({ value, max, label }: Props) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-3 overflow-hidden rounded-full bg-panel"
    >
      <div className="h-full rounded-full bg-sun transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  )
}
