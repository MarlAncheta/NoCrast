// Regenerates the pictures in docs/screenshots.
// Start the built app first:  npm run build && npm run preview
// Then run:                   npm run screenshots
// If Playwright's browser is not installed, run `npx playwright install chromium`, or set CHROMIUM_PATH to a Chromium binary.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const URL = process.env.APP_URL ?? 'http://localhost:4173'
const OUT = 'docs/screenshots'
mkdirSync(OUT, { recursive: true })

const custom = process.env.CHROMIUM_PATH
const browser = await chromium.launch({
  executablePath: custom || undefined,
  args: custom ? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--headless=new'] : [],
})
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()

// Pretend notifications are allowed so the permission bar does not appear in the pictures.
await page.addInitScript(() => {
  window.Notification = class {
    static permission = 'granted'
    static requestPermission() {
      return Promise.resolve('granted')
    }
    close() {}
  }
})
// A fake clock lets the pictures show 25 minutes of progress without waiting.
await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
await page.goto(URL)

async function addTask(title, priority, deadline) {
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Priority').selectOption(priority)
  if (deadline) await page.getByLabel('Deadline (date and exact time)').fill(deadline)
  await page.getByRole('button', { name: 'Save task' }).click()
}
const settle = () => page.waitForTimeout(1600)
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })

await addTask('Write project report', 'high', '2026-11-16T17:00')
await addTask('Reply to emails', 'low')
await addTask('Study for the exam', 'urgent', '2026-11-13T10:20')
await addTask('Book the dentist', 'medium', '2026-11-13T12:00')
await page.waitForTimeout(500)
// Three quick tab switches in a row, to show how close interruptions are grouped.
const hide = (hidden) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { value: h, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
for (let i = 0; i < 3; i++) {
  await hide(true)
  await page.clock.fastForward(15_000)
  await hide(false)
}
await page.clock.fastForward(25 * 60_000)
await page.getByRole('button', { name: 'Complete Book the dentist' }).click()
await settle()
// keep only the OVERDUE notice in the first picture
const stale = page.getByRole('alert').filter({ hasNotText: 'passed its deadline' })
while ((await stale.count()) > 0) await stale.first().getByRole('button', { name: 'Dismiss', exact: true }).click()
await shot('today')

const dismiss = page.getByRole('button', { name: 'Dismiss' })
while ((await dismiss.count()) > 0) await dismiss.first().click()
await page.getByRole('button', { name: 'Take a break' }).click()
await page.getByRole('button', { name: 'Start break' }).click()
await page.clock.fastForward(2 * 60_000)
await settle()
await shot('break')
await page.getByRole('button', { name: 'End break' }).click()

await page.getByRole('button', { name: 'Complete Reply to emails' }).click()
await page.getByRole('button', { name: 'Analytics' }).click()
await settle()
await page.getByTestId('chart-bucket').last().hover() // show the exact-value tooltip
await shot('analytics')

await page.getByRole('button', { name: 'Settings' }).click()
await settle()
await shot('settings')

await browser.close()
console.log(`Saved screenshots to ${OUT}`)
