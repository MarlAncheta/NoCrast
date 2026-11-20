// Regenerates the pictures in docs/screenshots (desktop and phone).
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

// A fake clock lets the pictures show 25 minutes of progress without waiting.
async function openApp(contextOptions) {
  const page = await (await browser.newContext(contextOptions)).newPage()
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
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
  await page.goto(URL)
  return page
}
const hide = (page, hidden) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { value: h, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
async function addTask(page, title, priority, deadline) {
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Priority').selectOption(priority)
  if (deadline) await page.getByLabel('Deadline (date and exact time)').fill(deadline)
}
const save = (page) => page.getByRole('button', { name: 'Save task' }).click()
const settle = (page) => page.waitForTimeout(1600)
const shot = (page, name, options = { fullPage: true }) => page.screenshot({ path: `${OUT}/${name}.png`, ...options })

// ---------------------------------------------------------------- desktop
const page = await openApp({ viewport: { width: 1280, height: 900 } })

await addTask(page, 'Write project report', 'high', '2026-11-16T17:00')
await shot(page, 'task-form', { fullPage: false })
await save(page)
await addTask(page, 'Reply to emails', 'low')
await save(page)
await addTask(page, 'Study for the exam', 'urgent', '2026-11-13T10:20')
await save(page)
await addTask(page, 'Book the dentist', 'medium', '2026-11-13T12:00')
await save(page)
await page.waitForTimeout(500)
// Three quick tab switches in a row, to show how close interruptions are grouped.
for (let i = 0; i < 3; i++) {
  await hide(page, true)
  await page.clock.fastForward(15_000)
  await hide(page, false)
}
await page.clock.fastForward(25 * 60_000)
await page.getByRole('button', { name: 'Complete Book the dentist' }).click()
await settle(page)

await page.evaluate(() => window.scrollTo(0, 0))
await shot(page, 'notices', { fullPage: false })

// keep only the OVERDUE notice in the main picture
const stale = page.getByRole('alert').filter({ hasNotText: 'passed its deadline' })
while ((await stale.count()) > 0) await stale.first().getByRole('button', { name: 'Dismiss', exact: true }).click()
await shot(page, 'today')

const group = page.getByRole('button', { name: /3 short interruptions/ })
await group.click()
await page.locator('section[aria-label="Interruptions"]').screenshot({ path: `${OUT}/interruptions-group.png` })
await group.click()

await page.getByRole('button', { name: 'Take a break' }).click()
await page.waitForTimeout(300)
await shot(page, 'break-picker', { fullPage: false })
await page.getByRole('button', { name: 'Start break' }).click()
await page.clock.fastForward(2 * 60_000)
await settle(page)
await shot(page, 'break')
await page.getByRole('button', { name: 'End break' }).click()

await page.getByRole('button', { name: 'Complete Reply to emails' }).click()
await page.getByRole('button', { name: 'Analytics' }).click()
await settle(page)
await page.getByTestId('chart-bucket').last().hover() // show the exact-value tooltip
await shot(page, 'analytics')

await page.getByRole('button', { name: 'Settings' }).click()
await settle(page)
await shot(page, 'settings')

// ---------------------------------------------------------------- phone
const phone = await openApp({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await addTask(phone, 'Study for the exam', 'urgent', '2026-11-13T10:20')
await save(phone)
await addTask(phone, 'Reply to emails', 'low')
await save(phone)
await phone.clock.fastForward(25 * 60_000)
await settle(phone)
await shot(phone, 'phone-today')

await phone.getByRole('button', { name: 'Dismiss all' }).click()
await phone.getByRole('button', { name: 'Take a break' }).click()
await phone.getByRole('button', { name: 'Start break' }).click()
await phone.clock.fastForward(60_000)
await settle(phone)
await shot(phone, 'phone-break')
await phone.getByRole('button', { name: 'End break' }).click()

await phone.getByRole('button', { name: 'Complete Study for the exam' }).click()
await phone.getByRole('button', { name: 'Analytics' }).click()
await settle(phone)
await shot(phone, 'phone-analytics')

await browser.close()
console.log(`Saved screenshots to ${OUT}`)
