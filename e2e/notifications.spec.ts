import { expect, test, type Page } from '@playwright/test'

async function addTask(page: Page, t: { title: string; deadline?: string }) {
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Title').fill(t.title)
  if (t.deadline) await page.getByLabel('Deadline (date and exact time)').fill(t.deadline)
  await page.getByRole('button', { name: 'Save task' }).click()
}

// Replaces the browser's Notification with a recorder, so the test can see exactly what would reach the desktop.
const stubNotifications = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __notes: object[]; Notification: unknown }
    w.__notes = []
    class FakeNotification {
      static permission = 'granted'
      static requestPermission() {
        return Promise.resolve('granted')
      }
      onclick = null
      constructor(title: string, options?: object) {
        w.__notes.push({ title, ...options })
      }
      close() {}
    }
    w.Notification = FakeNotification
  })
const notes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __notes: { title: string; requireInteraction?: boolean }[] }).__notes)
const titles = async (page: Page) => (await notes(page)).map((n) => n.title)

function wav() {
  const data = Buffer.alloc(800)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + data.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(8000, 24)
  h.writeUInt32LE(8000, 28)
  h.writeUInt16LE(1, 32)
  h.writeUInt16LE(8, 34)
  h.write('data', 36)
  h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

test('every close-in stage sends a desktop notification, and urgent ones stay until dismissed', async ({ page }) => {
  await stubNotifications(page)
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
  await page.goto('/')
  await addTask(page, { title: 'Write report', deadline: '2026-11-13T10:30' })
  await expect.poll(() => titles(page)).toContain('30 minutes left: Write report')

  for (const [minutes, title] of [
    [20, '10 minutes left: Write report'],
    [5, '5 minutes left: Write report'],
    [4, '1 minute left: Write report'],
    [1, 'Overdue: Write report'],
  ] as const) {
    await page.clock.fastForward(minutes * 60_000)
    await expect.poll(() => titles(page)).toContain(title)
  }
  const all = await notes(page)
  expect(all[0].requireInteraction).toBeFalsy()
  expect(all.at(-1)).toMatchObject({ title: 'Overdue: Write report', requireInteraction: true })
  await expect(page.getByRole('region', { name: 'Notification setup' })).toHaveCount(0)
})

test('days-ahead warnings: 1 week, 5 days, 3 days and 1 day', async ({ page }) => {
  await stubNotifications(page)
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
  await page.goto('/')
  await addTask(page, { title: 'Report', deadline: '2026-11-20T10:00' })
  await expect.poll(() => titles(page)).toContain('1 week left: Report')
  for (const title of ['5 days left: Report', '3 days left: Report', '1 day left: Report']) {
    await page.clock.fastForward(2 * 24 * 3_600_000)
    await expect.poll(() => titles(page)).toContain(title)
  }
})

test('a month and two weeks ahead', async ({ page }) => {
  await stubNotifications(page)
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
  await page.goto('/')
  await addTask(page, { title: 'Report', deadline: '2026-12-13T10:00' })
  await expect.poll(() => titles(page)).toContain('1 month left: Report')
  await page.clock.fastForward(16 * 24 * 3_600_000)
  await expect.poll(() => titles(page)).toContain('2 weeks left: Report')
})

test('the page asks the user to allow notifications when they are not on', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Notification setup' })).toBeVisible()
  await page.getByRole('button', { name: 'Not now' }).click()
  await expect(page.getByRole('region', { name: 'Notification setup' })).toHaveCount(0)
})

test('choose, keep and remove a custom notification sound', async ({ page }) => {
  await stubNotifications(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Notification sound').selectOption('custom')
  await page.getByLabel('Choose a sound file').setInputFiles({ name: 'ding.wav', mimeType: 'audio/wav', buffer: wav() })
  await expect(page.getByText('Current sound: ding.wav')).toBeVisible()

  await page.getByRole('button', { name: 'Send test notification' }).click()
  await expect.poll(() => titles(page)).toContain('NoCrast test notification')

  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByLabel('Notification sound')).toHaveValue('custom')
  await expect(page.getByText('Current sound: ding.wav')).toBeVisible()

  await page.getByRole('button', { name: 'Remove sound' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Your sound was removed.' })).toBeVisible()
  await expect(page.getByLabel('Notification sound')).toHaveValue('beep')
})

test('a file that is not audio is refused', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Notification sound').selectOption('custom')
  await page.getByLabel('Choose a sound file').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('x') })
  await expect(page.getByText('Choose an audio file')).toBeVisible()
})
