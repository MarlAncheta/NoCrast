import { useState, type FormEvent } from 'react'
import type { Priority, Task, TaskInput } from '../../services/database'
import { validateTask, type TaskErrors } from '../../utils/validation'
import { fromDateTimeValue, toDateTimeValue } from '../../utils/date'
import { Button } from '../common/Button'

interface Props {
  initial?: Task
  onSave: (values: TaskInput) => void
  onCancel: () => void
}

const FIELD = 'w-full rounded-xl border-2 border-snow/40 bg-night px-3 py-2 text-snow placeholder:text-snow/50'

export function TaskForm({ initial, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium')
  const [deadline, setDeadline] = useState(toDateTimeValue(initial?.deadline))
  const [errors, setErrors] = useState<TaskErrors>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const result = validateTask({ title, description, category, priority, deadline: fromDateTimeValue(deadline) })
    if (result.ok) onSave(result.value)
    else setErrors(result.errors)
  }

  const err = (k: keyof TaskInput) =>
    errors[k] && (
      <p role="alert" className="text-sm font-bold text-red">
        {errors[k]}
      </p>
    )

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <label className="block">
        Title
        <input className={FIELD} placeholder="What are you avoiding?" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      {err('title')}
      <label className="block">
        Description
        <textarea
          className={FIELD}
          rows={3}
          placeholder="Any details worth remembering (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {err('description')}
      <div className="grid grid-cols-2 gap-3">
        <label>
          Category
          <input className={FIELD} placeholder="e.g. Work, School, Home" value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label>
          Priority
          <select className={FIELD} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2">
          Deadline (date and exact time)
          <input className={FIELD} type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
      </div>
      {err('category')}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save task</Button>
      </div>
    </form>
  )
}
