// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskCard, type TaskStatus } from '../components/tasks/TaskCard'
import type { Task } from '../services/database'

afterEach(cleanup)
const base: Task = {
  id: '1',
  title: 'Write report',
  description: '',
  category: '',
  priority: 'high',
  deadline: null,
  done: false,
  createdAt: 0,
  completedAt: null,
}
const props = {
  elapsedMs: 61_000,
  breakMs: 0,
  overdue: false,
  ageText: '12 min ago',
  onEdit: () => {},
  onToggle: () => {},
  onDelete: () => {},
}
const renderCard = (t: Task, status: TaskStatus, extra = {}) =>
  render(
    <ul>
      <TaskCard task={t} status={status} {...props} {...extra} />
    </ul>,
  )

describe('TaskCard states', () => {
  it('the active task shows TRACKING NOW and a live timer, with no OPEN badge', () => {
    renderCard(base, 'active')
    expect(screen.getByText('TRACKING NOW')).toBeTruthy()
    expect(screen.getByText('Time on task')).toBeTruthy()
    expect(screen.getByText('00:01:01')).toBeTruthy()
    expect(screen.queryByText('OPEN')).toBeNull()
  })
  it('a queued task shows Queued and a static "Created … ago", never a ticking timer', () => {
    renderCard(base, 'queued')
    expect(screen.getByText('Queued')).toBeTruthy()
    expect(screen.getByText('Created 12 min ago')).toBeTruthy()
    expect(screen.queryByText('Time on task')).toBeNull()
    expect(screen.queryByText('00:01:01')).toBeNull()
    expect(screen.queryByText('TRACKING NOW')).toBeNull()
  })
  it('a done task shows DONE, total time, finish time and Reopen', () => {
    renderCard({ ...base, done: true, completedAt: new Date(2026, 10, 13, 19, 57).getTime() }, 'done')
    expect(screen.getByText('DONE')).toBeTruthy()
    expect(screen.getByText('Total time')).toBeTruthy()
    expect(screen.getByText(/Finished/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reopen Write report' })).toBeTruthy()
    expect(screen.queryByText('Mark done')).toBeNull()
  })
  it('puts priority on the left edge (red urgent, amber high, blue low) and also says it in words', () => {
    const edge = (p: Task['priority']) => {
      const { container, unmount } = renderCard({ ...base, priority: p }, 'queued')
      const cls = container.querySelector('li')!.className
      unmount()
      return cls
    }
    expect(edge('urgent')).toContain('border-l-red')
    expect(edge('high')).toContain('border-l-amber')
    expect(edge('low')).toContain('border-l-blue')
    renderCard({ ...base, priority: 'urgent' }, 'queued')
    expect(screen.getByText('Urgent priority')).toBeTruthy()
  })
  it('shows OVERDUE as quiet text, and "Overdue, still running" only on the active task', () => {
    renderCard({ ...base, deadline: 1000 }, 'active', { overdue: true })
    expect(screen.getByText('OVERDUE')).toBeTruthy()
    expect(screen.getByText('Overdue, still running')).toBeTruthy()
    cleanup()
    renderCard({ ...base, deadline: 1000 }, 'queued', { overdue: true })
    expect(screen.getByText('OVERDUE')).toBeTruthy()
    expect(screen.queryByText('Overdue, still running')).toBeNull()
  })
  it('never calls a done task overdue', () => {
    renderCard({ ...base, done: true, deadline: 1000, completedAt: 500 }, 'done')
    expect(screen.queryByText('OVERDUE')).toBeNull()
  })
  it('wires up mark done, edit and delete', async () => {
    const onToggle = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderCard(base, 'queued', { onToggle, onEdit, onDelete })
    await userEvent.click(screen.getByRole('button', { name: 'Complete Write report' }))
    await userEvent.click(screen.getByRole('button', { name: 'Edit Write report' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Write report' }))
    expect(onToggle).toHaveBeenCalled()
    expect(onEdit).toHaveBeenCalled()
    expect(onDelete).toHaveBeenCalled()
  })
})
