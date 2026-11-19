import type { Priority, TaskInput } from '../services/database'

export type TaskErrors = Partial<Record<keyof TaskInput, string>>
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

export function validateTask(input: TaskInput): { ok: true; value: TaskInput } | { ok: false; errors: TaskErrors } {
  const errors: TaskErrors = {}
  const title = input.title.trim()
  if (!title) errors.title = 'Give the task a title.'
  else if (title.length > 120) errors.title = 'Keep the title under 120 characters.'
  if (input.description.length > 1000) errors.description = 'Keep the description under 1000 characters.'
  if (input.category.trim().length > 30) errors.category = 'Keep the category under 30 characters.'
  if (!PRIORITIES.includes(input.priority)) errors.priority = 'Pick a priority.'
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { ...input, title, description: input.description.trim(), category: input.category.trim() } }
}
