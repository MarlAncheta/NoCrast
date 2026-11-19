import { expect, test, type Page } from '@playwright/test'

async function addTask(page: Page, t: { title: string; priority?: string; deadline?: string }) {
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Title').fill(t.title)
  if (t.priority) await page.getByLabel('Priority').selectOption(t.priority)
  if (t.deadline) await page.getByLabel('Deadline (date and exact time)').fill(t.deadline)
  await page.getByRole('button', { name: 'Save task' }).click()
}
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { value: h, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
const alertWith = (page: Page, text: string) => page.getByRole('alert').filter({ hasText: text })

test('form validation, hint text and saving', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add task' }).click()
  await expect(page.getByPlaceholder('What are you avoiding?')).toBeVisible()
  await page.getByRole('button', { name: 'Save task' }).click()
  await expect(page.getByRole('alert')).toContainText('Give the task a title.')
  await page.getByLabel('Title').fill('Write report')
  await page.getByRole('button', { name: 'Save task' }).click()
  await expect(page.getByLabel('Title')).toBeHidden()
  await expect(page.getByText('Write report', { exact: true })).toBeVisible()
})

test('editing a task persists after reload', async ({ page }) => {
  await page.goto('/')
  await addTask(page, { title: 'Old name' })
  await page.getByRole('button', { name: 'Edit Old name' }).click()
  await page.getByLabel('Title').fill('New name')
  await page.getByRole('button', { name: 'Save task' }).click()
  await expect(page.getByLabel('Title')).toBeHidden() // the dialog closes only after the save is stored
  await page.reload()
  await expect(page.getByText('New name', { exact: true })).toBeVisible()
  await expect(page.getByText('Old name', { exact: true })).toHaveCount(0)
})

test('same deadline: the higher priority task is tracked', async ({ page }) => {
  await page.goto('/')
  await addTask(page, { title: 'Low one', priority: 'low', deadline: '2030-01-01T09:00' })
  await addTask(page, { title: 'Urgent one', priority: 'urgent', deadline: '2030-01-01T09:00' })
  await expect(page.getByText('Now tracking: Urgent one')).toBeVisible()
})

test('deadline warnings pop up in stages and overdue keeps the timer running', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
  await page.goto('/')
  await addTask(page, { title: 'Write report', deadline: '2026-11-13T10:30' })
  await expect(alertWith(page, '30 minutes left')).toBeVisible()

  await page.clock.fastForward(20 * 60_000)
  await expect(alertWith(page, '10 minutes left')).toBeVisible()
  await page.clock.fastForward(5 * 60_000)
  await expect(alertWith(page, '5 minutes left')).toContainText('Nice try')
  await page.clock.fastForward(4 * 60_000)
  await expect(alertWith(page, '1 minute left')).toContainText('Nice try')

  await page.clock.fastForward(60_000)
  await expect(alertWith(page, 'passed its deadline')).toBeVisible()
  await expect(page.getByText('OVERDUE', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Overdue, still running')).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText(/00:3[01]:\d\d/)

  // Only the newest three notices show; the rest are tucked behind a count.
  await expect(page.getByText('2 earlier notices')).toBeVisible()
  await alertWith(page, 'passed its deadline').getByRole('button', { name: 'Dismiss', exact: true }).click()
  await expect(alertWith(page, 'passed its deadline')).toHaveCount(0)
})

test('accidental tab switches are ignored, real ones are logged, labeled ones clear', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
  await page.goto('/')
  await addTask(page, { title: 'Write report' })

  await setHidden(page, true)
  await page.clock.fastForward(3_000)
  await setHidden(page, false)
  await expect(page.getByText('Short interruption')).toHaveCount(0)

  await setHidden(page, true)
  await page.clock.fastForward(15_000)
  await setHidden(page, false)
  await expect(page.getByText(/Short interruption/)).toBeVisible()

  await page.getByRole('button', { name: 'Productive' }).click()
  await expect(page.getByText(/Clears in/)).toBeVisible()
  await page.clock.fastForward(61_000)
  await expect(page.getByText(/Short interruption/)).toHaveCount(0)
})

test('tab switches during a break are not logged', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
  await page.goto('/')
  await addTask(page, { title: 'Write report' })
  await page.getByRole('button', { name: 'Take a break' }).click()
  await page.getByRole('button', { name: 'Start break' }).click()
  await setHidden(page, true)
  await page.clock.fastForward(40_000)
  await setHidden(page, false)
  await expect(page.getByText(/(Short|Extended) interruption/)).toHaveCount(0)
  await page.getByRole('button', { name: 'End break' }).click()
})

test('analytics shows finished tasks and breaks', async ({ page }) => {
  await page.goto('/')
  await addTask(page, { title: 'Write report' })
  await page.getByRole('button', { name: 'Take a break' }).click()
  await page.getByRole('button', { name: 'Start break' }).click()
  await page.getByRole('button', { name: 'End break' }).click()
  await page.getByRole('button', { name: 'Complete Write report' }).click()
  await page.getByRole('button', { name: 'Analytics' }).click()
  await expect(page.getByText('Finished tasks', { exact: true })).toBeVisible()
  await expect(page.getByText('Total break time', { exact: true })).toBeVisible()
  await expect(page.getByText('Break time', { exact: true })).toBeVisible()
})

test('export, delete all data, then import restores it', async ({ page }) => {
  await page.goto('/')
  await addTask(page, { title: 'Keep me' })
  await page.getByRole('button', { name: 'Settings' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const file = await (await download).path()

  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Delete all data' }).click()
  await expect(page.getByRole('status')).toContainText('All local data deleted')
  await page.getByRole('button', { name: 'Today' }).click()
  await expect(page.getByText('Keep me', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Settings' }).click()
  page.once('dialog', (d) => void d.accept())
  await page.locator('input[type=file]').setInputFiles(file)
  await expect(page.getByRole('status')).toContainText('Imported 1 tasks')
  await page.getByRole('button', { name: 'Today' }).click()
  await expect(page.getByText('Keep me', { exact: true })).toBeVisible()
})
