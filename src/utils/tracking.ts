import type { Priority, Task } from '../services/database'

const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

// Which open task the big timer follows: earliest deadline, then higher priority, then oldest.
export function pickTracked(tasks: Task[]): Task | undefined {
  return tasks
    .filter((t) => !t.done)
    .sort(
      (a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity) || RANK[a.priority] - RANK[b.priority] || a.createdAt - b.createdAt,
    )[0]
}
