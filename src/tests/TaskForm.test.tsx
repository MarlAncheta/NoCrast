// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskForm } from '../components/tasks/TaskForm'

afterEach(cleanup)

describe('TaskForm', () => {
  it('shows an error and does not save without a title', async () => {
    const onSave = vi.fn()
    render(<TaskForm onSave={onSave} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save task' }))
    expect(screen.getByRole('alert').textContent).toMatch(/title/i)
    expect(onSave).not.toHaveBeenCalled()
  })
  it('saves trimmed values with a default priority', async () => {
    const onSave = vi.fn()
    render(<TaskForm onSave={onSave} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText('Title'), '  Write report ')
    await userEvent.click(screen.getByRole('button', { name: 'Save task' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Write report', priority: 'medium', deadline: null }))
  })
  it('prefills when editing', () => {
    const t = {
      id: '1',
      title: 'Old',
      description: 'd',
      category: 'work',
      priority: 'high' as const,
      deadline: null,
      done: false,
      createdAt: 0,
    }
    render(<TaskForm initial={t} onSave={() => {}} onCancel={() => {}} />)
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Old')
    expect((screen.getByLabelText('Priority') as HTMLSelectElement).value).toBe('high')
  })
})
