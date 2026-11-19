// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastStack } from '../components/common/ToastStack'

afterEach(cleanup)

describe('ToastStack', () => {
  it('shows every warning as an alert and lets the user dismiss one', async () => {
    const onDismiss = vi.fn()
    render(
      <ToastStack
        toasts={[
          { id: 'a', level: 'urgent', title: '1 minute left', body: 'Nice try getting "Write" done before the deadline! 1 minute left.' },
          { id: 'b', level: 'overdue', title: 'Overdue', body: '"Write" passed its deadline. Its timer keeps running.' },
        ]}
        onDismiss={onDismiss}
      />,
    )
    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(screen.getByText('OVERDUE')).toBeTruthy()
    expect(screen.getByText(/Nice try/)).toBeTruthy()
    await userEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0])
    expect(onDismiss).toHaveBeenCalledWith('a')
  })
})
