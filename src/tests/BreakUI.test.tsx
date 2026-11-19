// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BreakPicker } from '../components/breaks/BreakPicker'
import { BreakPanel } from '../components/breaks/BreakPanel'
import type { BreakSession } from '../services/database'

afterEach(cleanup)
const session: BreakSession = {
  id: 'b',
  type: 'short',
  startTime: 0,
  endTime: null,
  plannedDuration: 300_000,
  actualDuration: 0,
  status: 'active',
  extensionCount: 0,
}

describe('BreakPicker', () => {
  it('does nothing until confirmed, and cancel does not start a break', async () => {
    const onStart = vi.fn()
    const onCancel = vi.fn()
    render(<BreakPicker onStart={onStart} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
    expect(onStart).not.toHaveBeenCalled()
  })
  it('starts a preset duration', async () => {
    const onStart = vi.fn()
    render(<BreakPicker onStart={onStart} onCancel={() => {}} />)
    await userEvent.click(screen.getByLabelText('15 minutes'))
    await userEvent.click(screen.getByRole('button', { name: 'Start break' }))
    expect(onStart).toHaveBeenCalledWith({ durationMs: 900_000, type: 'long' })
  })
  it('starts a custom duration and rejects bad ones', async () => {
    const onStart = vi.fn()
    render(<BreakPicker onStart={onStart} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText('Custom minutes'), 'abc')
    await userEvent.click(screen.getByRole('button', { name: 'Start break' }))
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(onStart).not.toHaveBeenCalled()
    await userEvent.clear(screen.getByLabelText('Custom minutes'))
    await userEvent.type(screen.getByLabelText('Custom minutes'), '7')
    await userEvent.click(screen.getByRole('button', { name: 'Start break' }))
    expect(onStart).toHaveBeenCalledWith({ durationMs: 420_000, type: 'custom' })
  })
})

describe('BreakPanel', () => {
  it('shows break mode and the remaining time', () => {
    render(<BreakPanel session={session} now={60_000} onExtend={() => {}} onSkip={() => {}} onEnd={() => {}} />)
    expect(screen.getByText('BREAK MODE')).toBeTruthy()
    expect(screen.getByTestId('break-countdown').textContent).toBe('00:04:00')
  })
  it('extends, skips and ends', async () => {
    const onExtend = vi.fn()
    const onSkip = vi.fn()
    const onEnd = vi.fn()
    render(<BreakPanel session={session} now={0} onExtend={onExtend} onSkip={onSkip} onEnd={onEnd} />)
    await userEvent.click(screen.getByRole('button', { name: '+5 min' }))
    await userEvent.type(screen.getByLabelText('Custom extension (minutes)'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Extend' }))
    await userEvent.click(screen.getByRole('button', { name: 'Skip break' }))
    await userEvent.click(screen.getByRole('button', { name: 'End break' }))
    expect(onExtend).toHaveBeenNthCalledWith(1, 300_000)
    expect(onExtend).toHaveBeenNthCalledWith(2, 180_000)
    expect(onSkip).toHaveBeenCalled()
    expect(onEnd).toHaveBeenCalled()
  })
})
