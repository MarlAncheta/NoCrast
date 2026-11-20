import { expect, test, type Locator, type Page } from '@playwright/test'

async function addTask(page: Page, t: { title: string; priority?: string; deadline?: string }) {
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Title', { exact: true }).fill(t.title)
  if (t.priority) await page.getByLabel('Priority').selectOption(t.priority)
  if (t.deadline) await page.getByLabel('Deadline (date and exact time)').fill(t.deadline)
  await page.getByRole('button', { name: 'Save task' }).click()
}
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { value: h, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
const css = (loc: Locator, prop: string) => loc.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)
const card = (page: Page, title: string) => page.locator('li[data-status]').filter({ hasText: title })
const T0 = new Date('2026-11-13T10:00:00')

test('only the tracked task ticks; the others are quiet and say when they were created', async ({ page }) => {
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await addTask(page, { title: 'Later task', deadline: '2026-11-20T10:00' })
  await addTask(page, { title: 'Sooner task', deadline: '2026-11-14T10:00' })
  const active = card(page, 'Sooner task')
  const queued = card(page, 'Later task')

  await expect(active).toHaveAttribute('data-status', 'active')
  await expect(queued).toHaveAttribute('data-status', 'queued')
  await expect(page.locator('li[data-status]').first()).toHaveAttribute('data-status', 'active')
  await expect(active).toContainText('TRACKING NOW')
  await expect(active).toContainText('Time on task')
  await expect(queued).toContainText('Queued')
  await expect(queued).toContainText(/Created (just now|\d+ min ago)/)
  await expect(queued).not.toContainText('Time on task')
  await expect(queued).not.toContainText('TRACKING NOW')
  await expect(page.getByText('OPEN', { exact: true })).toHaveCount(0)

  await page.clock.fastForward(5 * 60_000)
  await expect(queued).toContainText('Created 5 min ago')
  await expect(active.getByText(/00:05:0\d/)).toBeVisible()
  await expect(page.getByText('Time on task')).toHaveCount(1)

  await page.getByRole('button', { name: 'Complete Sooner task' }).click()
  await expect(card(page, 'Sooner task')).toHaveAttribute('data-status', 'done')
  await expect(card(page, 'Sooner task')).toContainText('DONE')
  await expect(card(page, 'Later task')).toHaveAttribute('data-status', 'active')
})

test('priority is a thin colored left edge, and still named in words', async ({ page }) => {
  await page.goto('/')
  for (const [name, priority] of [
    ['U', 'urgent'],
    ['H', 'high'],
    ['M', 'medium'],
    ['L', 'low'],
  ])
    await addTask(page, { title: `${name} task`, priority })
  const edge = async (title: string) => ({
    width: await css(card(page, title), 'border-left-width'),
    color: await css(card(page, title), 'border-left-color'),
  })
  expect(await edge('U task')).toEqual({ width: '3px', color: 'rgb(242, 73, 61)' })
  expect(await edge('H task')).toEqual({ width: '3px', color: 'rgb(245, 158, 11)' })
  expect(await edge('L task')).toEqual({ width: '3px', color: 'rgb(61, 107, 255)' })
  const medium = (await edge('M task')).color
  expect(['rgb(242, 73, 61)', 'rgb(245, 158, 11)', 'rgb(61, 107, 255)']).not.toContain(medium)
  await expect(card(page, 'U task')).toContainText('Urgent priority')
  await expect(page.getByText('urgent', { exact: true })).toHaveCount(0) // no filled priority chip
})

test('break mode: countdown first and large, task timer dim, controls kept, detection resumes fresh', async ({ page }) => {
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await addTask(page, { title: 'Write report' })
  await page.getByRole('button', { name: 'Take a break' }).click()
  await page.getByRole('button', { name: 'Start break' }).click()

  const countdown = page.getByTestId('break-countdown')
  const taskTimer = page.getByRole('timer')
  const size = (l: Locator) => l.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(await size(countdown)).toBeGreaterThan((await size(taskTimer)) * 2)
  expect(await taskTimer.evaluate((el) => parseFloat(getComputedStyle(el.parentElement as HTMLElement).opacity))).toBeLessThan(1)
  const c = (await countdown.boundingBox())!
  const t = (await taskTimer.boundingBox())!
  expect(c.y).toBeLessThan(t.y)
  await expect(page.getByText('Task timers keep running during a break')).toBeVisible()
  for (const name of ['+5 min', '+10 min', 'Extend', 'Skip break', 'End break'])
    await expect(page.getByRole('button', { name })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Take a break' })).toHaveCount(0)

  // The break runs out: no judgment, and tracking starts again from a clean slate.
  await page.clock.fastForward(6 * 60_000)
  await expect(page.getByText('BREAK MODE')).toHaveCount(0)
  await expect(page.getByText(/Short interruption|Possible inactivity|Extended interruption/)).toHaveCount(0)
  await page.waitForTimeout(500)
  await setHidden(page, true)
  await page.clock.fastForward(15_000)
  await setHidden(page, false)
  await expect(page.getByText(/Short interruption/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^(Productive|Necessary|Distraction)$/, pressed: true })).toHaveCount(0)
})

test('close interruptions are grouped, expandable, and can be labeled one by one or all at once', async ({ page }) => {
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await addTask(page, { title: 'Write report' })
  await page.waitForTimeout(500) // let tracking start before the first tab switch
  for (let i = 0; i < 3; i++) {
    await setHidden(page, true)
    await page.clock.fastForward(15_000)
    await setHidden(page, false)
  }
  const header = page.getByRole('button', { name: /3 short interruptions/ })
  await expect(header).toBeVisible()
  await expect(header).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText(/^Short interruption/)).toHaveCount(0)

  await header.click()
  await expect(header).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText(/^Short interruption/)).toHaveCount(3)
  await page.getByRole('button', { name: 'Productive', exact: true }).first().click()
  await expect(page.getByText('2 unreviewed, 1 productive')).toBeVisible()

  await page.getByRole('button', { name: 'Mark all as Distraction' }).click()
  await expect(page.getByText(/3 distraction/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Distraction', exact: true, pressed: true })).toHaveCount(3)
  await expect(page.locator('dt', { hasText: 'Distractions' }).locator('xpath=following-sibling::dd')).toHaveText('3')

  await page.clock.fastForward(61_000)
  await expect(page.getByText(/3 short interruptions/)).toHaveCount(0)
})

for (const vp of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test(`notices sit in the corner, never overlap, and leave every button reachable (${vp.name})`, async ({ page }) => {
    await page.setViewportSize(vp)
    await page.clock.install({ time: T0 })
    await page.goto('/')
    await addTask(page, { title: 'A', deadline: '2026-11-13T10:30' })
    await addTask(page, { title: 'B', deadline: '2026-11-13T10:10' })
    await addTask(page, { title: 'C', deadline: '2026-11-13T10:01' })
    await expect(page.getByRole('alert')).toHaveCount(3)

    const boxes = (await Promise.all((await page.getByRole('alert').all()).map((a) => a.boundingBox()))).map((b) => b!)
    const last = boxes[boxes.length - 1]
    expect(last.y + last.height).toBeLessThanOrEqual(vp.height - 8)
    if (vp.name === 'desktop') {
      expect(Math.abs(last.x + last.width - (vp.width - 16))).toBeLessThan(3)
      expect(last.width).toBeLessThanOrEqual(385)
    } else expect(last.width).toBeGreaterThan(vp.width - 40)
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
        expect(overlap).toBe(false)
      }
    if (vp.name === 'desktop') {
      // A gutter beside the page: no button, field or link overlaps any notice at any scroll position.
      expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingRight))).toBeGreaterThanOrEqual(400)
      const controls = (await page.locator('main:visible button, main:visible input, main:visible select, main:visible a').all()).filter(
        Boolean,
      )
      for (const control of controls) {
        const c = await control.boundingBox()
        if (!c) continue
        for (const b of boxes)
          expect(c.x + c.width <= b.x || b.x + b.width <= c.x || c.y + c.height <= b.y || b.y + b.height <= c.y).toBe(true)
      }
    } else {
      expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom))).toBeGreaterThan(100)
    }

    // Playwright refuses to click anything that is covered, so this proves the notices do not block the buttons.
    for (const title of ['C', 'B', 'A']) await page.getByRole('button', { name: `Complete ${title}` }).click()
    await page.getByRole('button', { name: 'Dismiss all' }).click()
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom))).toBe(0)
    // the gutter eases away, so wait for it rather than reading it mid-transition
    await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingRight))).toBe(0)
  })
}

test('buttons use the agreed colors, with hover and keyboard focus states', async ({ page }) => {
  await page.goto('/')
  const add = page.getByRole('button', { name: 'Add task' })
  expect(await css(add, 'background-color')).toBe('rgb(245, 158, 11)')
  expect(await css(add, 'color')).toBe('rgb(15, 23, 42)')
  const breakBtn = page.getByRole('button', { name: 'Take a break' })
  expect(await css(breakBtn, 'background-color')).toBe('rgb(61, 107, 255)')
  expect(await css(breakBtn, 'color')).toBe('rgb(255, 255, 255)')

  await add.hover()
  await expect.poll(() => css(add, 'background-color')).toBe('rgb(251, 191, 36)')
  await breakBtn.hover()
  await expect.poll(() => css(breakBtn, 'background-color')).toBe('rgb(47, 88, 230)')

  await add.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(add).toBeFocused()
  expect(await css(add, 'outline-style')).toBe('solid')
  expect(await css(add, 'outline-width')).toBe('3px')

  await addTask(page, { title: 'Write report' })
  const done = page.getByRole('button', { name: 'Complete Write report' })
  expect(await css(done, 'background-color')).toBe('rgb(245, 158, 11)')
  await page.getByRole('button', { name: 'Settings' }).click()
  const del = page.getByRole('button', { name: 'Delete all data' })
  expect(await css(del, 'background-color')).toBe('rgb(242, 73, 61)')
  expect(await css(del, 'color')).toBe('rgb(255, 255, 255)')
})

test('major cards share one border, radius and padding, and the timer card keeps its blue outline', async ({ page }) => {
  await page.goto('/')
  await addTask(page, { title: 'Write report' })
  for (const name of ['Tasks', 'Interruptions']) {
    const s = page.locator(`section[aria-label="${name}"]`)
    expect(await css(s, 'border-top-width')).toBe('1px')
    expect(await css(s, 'border-top-color')).toBe('rgba(255, 255, 255, 0.08)')
    expect(await css(s, 'border-radius')).toBe('24px')
    expect(await css(s, 'padding-top')).toBe('24px')
  }
  const hero = page.locator('section[aria-label="Timer"]')
  expect(await css(hero, 'border-top-width')).toBe('4px')
  expect(await css(hero, 'border-top-color')).toBe('rgb(61, 107, 255)')

  await page.getByRole('button', { name: 'Settings' }).click()
  for (const s of await page.locator('main section:visible').all()) {
    expect(await css(s, 'border-top-width')).toBe('1px')
    expect(await css(s, 'border-top-color')).toBe('rgba(255, 255, 255, 0.08)')
    expect(await css(s, 'border-radius')).toBe('24px')
  }
})

test('analytics: on-time completion replaces the duplicate metric, and the chart has gridlines and exact tooltips', async ({ page }) => {
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await addTask(page, { title: 'On time', deadline: '2026-11-13T10:30' })
  await addTask(page, { title: 'Late', deadline: '2026-11-13T10:05' })
  await addTask(page, { title: 'No deadline' })
  await page.clock.fastForward(10 * 60_000)
  for (const title of ['On time', 'Late', 'No deadline']) await page.getByRole('button', { name: `Complete ${title}` }).click()
  await page.getByRole('button', { name: 'Analytics' }).click()

  await expect(page.getByText('Completed tasks', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Finished tasks', { exact: true })).toBeVisible()
  await expect(page.getByText('On-time completion', { exact: true })).toBeVisible()
  await expect(page.getByText('50%', { exact: true })).toBeVisible()
  await expect(page.getByText('1 of 2 finished tasks with a deadline were done by it.')).toBeVisible()

  const chart = page.getByTestId('chart-bucket')
  await expect(chart).toHaveCount(7)
  await expect(page.getByText('Minutes', { exact: true })).toBeVisible()
  await expect(page.getByText('Date (month/day)')).toBeVisible()
  expect(await page.locator('.border-t.border-white\\/10').count()).toBe(3)
  await chart.last().hover()
  await expect(page.getByRole('tooltip')).toHaveText(/^\d+\/\d+: [\d.]+ min on tasks, 0 min on breaks$/)
  await page.mouse.move(0, 0)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await chart.first().focus()
  await expect(page.getByRole('tooltip')).toBeVisible()
})

test('analytics: with no deadlines the on-time rate says so instead of inventing one', async ({ page }) => {
  await page.goto('/')
  await addTask(page, { title: 'No deadline' })
  await page.getByRole('button', { name: 'Complete No deadline' }).click()
  await page.getByRole('button', { name: 'Analytics' }).click()
  await expect(page.getByText('No deadlines yet')).toBeVisible()
  await expect(page.getByText('Add deadlines to tasks to see this.')).toBeVisible()
})

test('settings: narrow inputs with units beside them, and validation unchanged', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  for (const [label, unit, max] of [
    ['Inactivity threshold', 'minutes', 60],
    ['Ignore short tab switches', 'seconds', 300],
  ] as const) {
    const input = page.getByLabel(label)
    const ib = (await input.boundingBox())!
    expect(ib.width).toBeGreaterThanOrEqual(80)
    expect(ib.width).toBeLessThanOrEqual(100)
    const ub = (await page.getByText(unit, { exact: true }).boundingBox())!
    expect(ub.x).toBeGreaterThanOrEqual(ib.x + ib.width)
    expect(Math.abs(ub.y + ub.height / 2 - (ib.y + ib.height / 2))).toBeLessThan(12)
    await input.fill('9999')
    await expect(input).toHaveValue(String(max))
    await input.fill('0')
    await expect(input).toHaveValue('1')
    await input.fill('7')
  }
  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByLabel('Inactivity threshold')).toHaveValue('7')
  await expect(page.getByLabel('Ignore short tab switches')).toHaveValue('7')
})

test.describe('phone-sized screen', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

  test('no page scrolls sideways, including break mode, long titles, notices and the chart', async ({ page }) => {
    await page.clock.install({ time: T0 })
    await page.goto('/')
    await addTask(page, {
      title: 'A very long task title that keeps going and going so it has to wrap onto several lines without breaking the layout',
      deadline: '2026-11-13T10:01',
    })
    await addTask(page, { title: 'Second', deadline: '2026-11-13T10:30' })
    await page.clock.fastForward(5 * 60_000)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    const timer = (await page.getByRole('timer').boundingBox())!
    expect(timer.x + timer.width).toBeLessThanOrEqual(375)

    await page.getByRole('button', { name: 'Take a break' }).click()
    await page.getByRole('button', { name: 'Start break' }).click()
    await expect(page.getByTestId('break-countdown')).toBeVisible()
    const cd = (await page.getByTestId('break-countdown').boundingBox())!
    expect(cd.x + cd.width).toBeLessThanOrEqual(375)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: 'End break' }).click()

    await page.getByRole('button', { name: 'Complete Second' }).click()
    await page.getByRole('button', { name: 'Analytics' }).click()
    await expect(page.getByTestId('chart-bucket')).toHaveCount(7)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: 'monthly' }).click()
    await expect(page.getByTestId('chart-bucket')).toHaveCount(30)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    await page.getByTestId('chart-bucket').last().focus()
    const tip = (await page.getByRole('tooltip').boundingBox())!
    expect(tip.x).toBeGreaterThanOrEqual(0)
    expect(tip.x + tip.width).toBeLessThanOrEqual(375)

    await page.getByRole('button', { name: 'Settings' }).click()
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    const input = (await page.getByLabel('Inactivity threshold').boundingBox())!
    expect(input.x + input.width).toBeLessThanOrEqual(375)
  })
})
