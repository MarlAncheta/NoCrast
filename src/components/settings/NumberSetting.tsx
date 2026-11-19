interface Props {
  id: string
  label: string
  description: string
  unit: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}

// A label and description on the left, a narrow input with its unit beside it on the right.
// On a small screen the input drops under the text.
export function NumberSetting({ id, label, description, unit, value, min, max, onChange }: Props) {
  return (
    <div className="grid items-center gap-x-6 gap-y-2 sm:grid-cols-[1fr_auto]">
      <div>
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-sm text-snow/70">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          aria-describedby={`${id}-hint`}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 rounded-xl border-2 border-snow/30 bg-night px-3 py-2 text-right text-snow tabular-nums"
        />
        <span className="w-16 text-snow/80">{unit}</span>
      </div>
    </div>
  )
}
