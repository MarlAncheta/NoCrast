// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../components/common/Button'
import { MinutesChart } from '../components/analytics/MinutesChart'
import { NumberSetting } from '../components/settings/NumberSetting'
import { InterruptionsPanel } from '../components/interruptions/InterruptionsPanel'
import { ToastStack } from '../components/common/ToastStack'
import { BreakPanel } from '../components/breaks/BreakPanel'
import type { ActivityEvent, BreakSession } from '../services/database'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Contrast ratio between two hex colors (WCAG).
const lum = (hex: string) => {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)

describe('buttons', () => {
  it('use amber with dark text, blue with white text, red with white text', () => {
    render(
      <>
        <Button>Amber</Button>
        <Button variant="blue">Blue</Button>
        <Button variant="danger">Red</Button>
      </>,
    )
    expect(screen.getByText('Amber').className).toMatch(/bg-amber.*text-ink/)
    expect(screen.getByText('Blue').className).toMatch(/bg-blue.*text-white/)
    expect(screen.getByText('Red').className).toMatch(/bg-red.*text-white/)
  })
  it('have hover and pressed states, and a disabled button does not fire', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Off
      </Button>,
    )
    const b = screen.getByRole('button', { name: 'Off' })
    expect(b.className).toContain('enabled:hover:bg-amber-hover')
    expect(b.className).toContain('enabled:active:bg-amber-press')
    expect(b.className).toContain('disabled:opacity-50')
    await userEvent.click(b)
    expect(onClick).not.toHaveBeenCalled()
  })
  it('documents the contrast of the requested colors', () => {
    expect(ratio('#f59e0b', '#0f172a')).toBeGreaterThan(7) // amber with dark text passes AAA
    expect(ratio('#3d6bff', '#ffffff')).toBeCloseTo(4.43, 1) // just under AA for small text
    expect(ratio('#f2493d', '#ffffff')).toBeCloseTo(3.63, 1) // passes only as large text
  })
})

describe('MinutesChart', () => {
  const buckets = [
    { label: '9', tasks: 25, breaks: 5 },
    { label: '10', tasks: 0, breaks: 0 },
  ]
  it('shows exact values in a tooltip on hover and hides it after', async () => {
    render(<MinutesChart buckets={buckets} unit="hour" />)
    expect(screen.queryByRole('tooltip')).toBeNull()
    await userEvent.hover(screen.getAllByTestId('chart-bucket')[0])
    expect(screen.getByRole('tooltip').textContent).toBe('9:00: 25 min on tasks, 5 min on breaks')
    await userEvent.unhover(screen.getAllByTestId('chart-bucket')[0])
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
  it('shows the tooltip for keyboard focus too, and labels each bucket for screen readers', async () => {
    render(<MinutesChart buckets={buckets} unit="day" />)
    await userEvent.tab()
    expect(screen.getByRole('tooltip').textContent).toBe('9: 25 min on tasks, 5 min on breaks')
    expect(screen.getAllByTestId('chart-bucket')[1].getAttribute('aria-label')).toBe('10: 0 min on tasks, 0 min on breaks')
  })
  it('labels the axes and draws three gridlines with a friendly top', () => {
    const { container } = render(<MinutesChart buckets={buckets} unit="hour" />)
    expect(screen.getByText('Minutes')).toBeTruthy()
    expect(screen.getByText('Hour of day')).toBeTruthy()
    expect(container.querySelectorAll('.border-t.border-white\\/10')).toHaveLength(3)
    expect(screen.getByText('30')).toBeTruthy() // 25 rounds up to 30
    expect(screen.getByText('15')).toBeTruthy()
  })
})

describe('NumberSetting', () => {
  it('puts a narrow input beside its unit and reports numbers', async () => {
    const onChange = vi.fn()
    render(
      <NumberSetting
        id="x"
        label="Inactivity threshold"
        description="Hint text"
        unit="minutes"
        min={1}
        max={60}
        value={3}
        onChange={onChange}
      />,
    )
    const input = screen.getByLabelText('Inactivity threshold') as HTMLInputElement
    expect(input.className).toContain('w-24') // 96px, inside the 80 to 100px range
    expect(screen.getByText('minutes')).toBeTruthy()
    expect(input.getAttribute('aria-describedby')).toBe('x-hint')
    expect(input.min).toBe('1')
    expect(input.max).toBe('60')
    await userEvent.type(input, '5')
    expect(onChange).toHaveBeenCalledWith(35)
  })
})

describe('InterruptionsPanel', () => {
  const e = (id: string, at: number): ActivityEvent => ({
    id,
    sessionId: 't',
    kind: 'short-interruption',
    at,
    durationMs: 15_000,
    verdict: 'unreviewed',
    reviewedAt: null,
  })
  const events = [e('a', 15_000), e('b', 40_000), e('c', 65_000)]
  it('shows a collapsed group, expands to the individual events, and keeps single labeling', async () => {
    const onLabel = vi.fn()
    render(<InterruptionsPanel events={events} now={100_000} minAwaySec={10} onLabel={onLabel} />)
    const header = screen.getByRole('button', { name: /3 short interruptions/ })
    expect(header.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Short interruption', { exact: false, selector: 'p' })).toBeNull()
    await userEvent.click(header)
    expect(header.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByText(/^Short interruption/)).toHaveLength(3)
    await userEvent.click(screen.getAllByRole('button', { name: 'Productive' })[0])
    expect(onLabel).toHaveBeenCalledTimes(1)
    expect(onLabel.mock.calls[0][1]).toBe('productive')
    expect(onLabel.mock.calls[0][0]).toHaveLength(1)
  })
  it('bulk labels exactly the events in the group', async () => {
    const onLabel = vi.fn()
    render(
      <InterruptionsPanel
        events={[...events, { ...e('z', 9_000_000), kind: 'extended-interruption' }]}
        now={9_000_100}
        minAwaySec={10}
        onLabel={onLabel}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as Distraction' }))
    expect(onLabel).toHaveBeenCalledTimes(1)
    expect(onLabel.mock.calls[0][0].sort()).toEqual(['a', 'b', 'c'])
    expect(onLabel.mock.calls[0][1]).toBe('distraction')
  })
  it('shows a lone event as a single card with no group controls', () => {
    render(<InterruptionsPanel events={[e('a', 15_000)]} now={20_000} minAwaySec={10} onLabel={() => {}} />)
    expect(screen.queryByRole('button', { name: /Mark all/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Distraction' })).toBeTruthy()
  })
})

describe('ToastStack', () => {
  const toast = (id: string) => ({ id, level: 'urgent' as const, title: `Title ${id}`, body: `Body ${id}` })
  it('shows only the newest three and says how many are tucked away', () => {
    render(<ToastStack toasts={['1', '2', '3', '4', '5'].map(toast)} onDismiss={() => {}} onDismissAll={() => {}} />)
    expect(screen.getAllByRole('alert')).toHaveLength(3)
    expect(screen.getByText('Title 5')).toBeTruthy()
    expect(screen.queryByText('Title 1')).toBeNull()
    expect(screen.getByText('2 earlier notices')).toBeTruthy()
  })
  it('offers Dismiss all only when there is more than one', async () => {
    const onDismissAll = vi.fn()
    const { rerender } = render(<ToastStack toasts={[toast('1')]} onDismiss={() => {}} onDismissAll={onDismissAll} />)
    expect(screen.queryByRole('button', { name: 'Dismiss all' })).toBeNull()
    rerender(<ToastStack toasts={[toast('1'), toast('2')]} onDismiss={() => {}} onDismissAll={onDismissAll} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss all' }))
    expect(onDismissAll).toHaveBeenCalled()
  })
  it('sits bottom-right, lets clicks through the gaps, and makes room under the page', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    const { container, unmount } = render(<ToastStack toasts={[toast('1')]} onDismiss={() => {}} />)
    const stack = container.firstElementChild as HTMLElement
    expect(stack.className).toContain('pointer-events-none')
    expect(stack.className).toContain('sm:right-4')
    expect(stack.className).toContain('sm:bottom-4')
    expect(stack.className).toContain('inset-x-3') // full width on a phone
    expect(screen.getByRole('alert').className).toContain('pointer-events-auto')
    expect(document.documentElement.style.getPropertyValue('--toast-space')).toBe('24px')
    unmount()
    expect(document.documentElement.style.getPropertyValue('--toast-space')).toBe('0px')
  })
})

describe('BreakPanel', () => {
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
  it('makes the countdown the large element and keeps all three controls', () => {
    render(<BreakPanel session={session} now={60_000} onExtend={() => {}} onSkip={() => {}} onEnd={() => {}} />)
    expect(screen.getByTestId('break-countdown').className).toContain('md:text-8xl')
    for (const name of ['+5 min', '+10 min', 'Extend', 'Skip break', 'End break']) expect(screen.getByRole('button', { name })).toBeTruthy()
  })
})
