// Records a silent demo video of NoCrast with on-screen captions and a visible cursor.
// Start the built app first:  npm run build && npm run preview
// Then run:                   npm run demo        (writes docs/demo/nocrast-demo.mp4 and nocrast-demo.gif)
// Needs ffmpeg on your PATH, or set FFMPEG to its location.
// If Playwright's browser is not installed, run `npx playwright install chromium`, or set CHROMIUM_PATH to a Chromium binary.
import { chromium } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const URL = process.env.APP_URL ?? 'http://localhost:4173'
const OUT = 'docs/demo'
const RAW = `${OUT}/raw`
rmSync(RAW, { recursive: true, force: true })
mkdirSync(RAW, { recursive: true })

const custom = process.env.CHROMIUM_PATH
const browser = await chromium.launch({
  executablePath: custom || undefined,
  args: custom ? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--headless=new'] : [],
})
const size = { width: 1280, height: 720 }
const context = await browser.newContext({ viewport: size })
const page = await context.newPage()

// Page helpers added to every page: a visible cursor, and a caption bar at the bottom left.
await page.addInitScript(() => {
  window.Notification = class {
    static permission = 'granted'
    static requestPermission() {
      return Promise.resolve('granted')
    }
    close() {}
  }
  const add = () => {
    if (document.getElementById('demo-caption')) return
    const cursor = document.createElement('div')
    Object.assign(cursor.style, {
      position: 'fixed',
      left: '-50px',
      top: '-50px',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.92)',
      border: '3px solid #3d6bff',
      boxShadow: '0 0 0 2px rgba(0,0,0,0.45)',
      pointerEvents: 'none',
      zIndex: '2147483647',
      transform: 'translate(-50%, -50%)',
      transition: 'transform 90ms',
    })
    const caption = document.createElement('div')
    caption.id = 'demo-caption'
    Object.assign(caption.style, {
      position: 'fixed',
      left: '16px',
      bottom: '16px',
      maxWidth: '540px',
      padding: '12px 18px',
      borderRadius: '14px',
      background: 'rgba(15,23,42,0.94)',
      color: '#fff',
      font: '700 20px/1.35 system-ui, sans-serif',
      border: '1px solid rgba(255,255,255,0.25)',
      zIndex: '2147483646',
      display: 'none',
      pointerEvents: 'none',
    })
    document.documentElement.append(cursor, caption)
    window.addEventListener(
      'mousemove',
      (e) => {
        cursor.style.left = e.clientX + 'px'
        cursor.style.top = e.clientY + 'px'
      },
      true,
    )
    window.addEventListener(
      'mousedown',
      () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.65)'
      },
      true,
    )
    window.addEventListener(
      'mouseup',
      () => {
        cursor.style.transform = 'translate(-50%, -50%)'
      },
      true,
    )
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add)
  else add()
})
// Record the screen with the browser's screencast: each frame arrives with its own timestamp.
const client = await context.newCDPSession(page)
const frames = []
const writes = []
client.on('Page.screencastFrame', (f) => {
  const name = `f${String(frames.length).padStart(6, '0')}.jpg`
  frames.push({ name, t: f.metadata.timestamp })
  writes.push(writeFile(`${RAW}/${name}`, Buffer.from(f.data, 'base64')))
  client.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
})
await client.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 })
await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
await page.goto(URL)

const pause = (ms) => page.waitForTimeout(ms)
const caption = (text) =>
  page.evaluate((t) => {
    const c = document.getElementById('demo-caption')
    if (!c) return
    c.textContent = t
    c.style.display = t ? 'block' : 'none'
  }, text)
async function moveTo(locator) {
  const b = await locator.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 24 })
}
async function click(locator) {
  await locator.scrollIntoViewIfNeeded()
  await moveTo(locator)
  await pause(150)
  await page.mouse.down()
  await pause(90)
  await page.mouse.up()
  await pause(300)
}
const type = async (locator, text) => {
  await click(locator)
  await page.keyboard.type(text, { delay: 55 })
}
// Moves the fake clock forward in small steps so timers roll visibly. Slow steps near a warning let each one appear.
async function lapse(virtualMs, stepMs = 10_000, delay = 40) {
  for (let t = 0; t < virtualMs; t += stepMs) {
    await page.clock.runFor(Math.min(stepMs, virtualMs - t))
    await pause(delay)
  }
}
const hide = (hidden) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { value: h, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
const scroll = async (y) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y)
  await pause(900)
}
async function addTask({ title, priority, deadline }) {
  await click(page.getByRole('button', { name: 'Add task' }))
  await type(page.getByLabel('Title'), title)
  if (priority) {
    await moveTo(page.getByLabel('Priority'))
    await page.getByLabel('Priority').selectOption(priority)
    await pause(500)
  }
  if (deadline) {
    await moveTo(page.getByLabel('Deadline (date and exact time)'))
    await page.getByLabel('Deadline (date and exact time)').fill(deadline)
    await pause(600)
  }
  await click(page.getByRole('button', { name: 'Save task' }))
}

// ---------------------------------------------------------------- the story
await caption('NoCrast: track how long work really takes, without being judged. Everything stays in your browser.')
await pause(3800)

await caption('Create a task. Its timer starts the moment you save it.')
await addTask({ title: 'Study for the exam', priority: 'urgent', deadline: '2026-11-13T10:20' })
await pause(2500)

await caption('A second task waits in the queue. Only the tracked task ticks.')
await addTask({ title: 'Reply to emails', priority: 'low' })
await pause(3000)

await caption(
  'Warnings arrive before every deadline: 1 month, 2 weeks, 1 week, 5 days, 3 days, 1 day, 5 hours, 3 hours, 1 hour, 30, 10, 5 and 1 minute.',
)
await lapse(9.5 * 60_000)
await lapse(60_000, 5_000, 130) // crosses 10 minutes left
await pause(1500)
await lapse(4 * 60_000)
await lapse(60_000, 5_000, 130) // crosses 5 minutes left ("Nice try")
await pause(2500)
await lapse(3.5 * 60_000)
await lapse(60_000, 5_000, 130) // crosses 1 minute left
await pause(1500)

await caption('Past the deadline? The timer keeps running and the task says OVERDUE.')
await lapse(60_000, 5_000, 130)
await pause(3500)
const dismissAll = page.getByRole('button', { name: 'Dismiss all' })
if (await dismissAll.count()) await click(dismissAll)

await caption('Switching tabs by accident is ignored. A real interruption is logged as only a possible distraction.')
await hide(true)
await lapse(3000, 1000, 200)
await hide(false)
await pause(2000)
for (let i = 0; i < 3; i++) {
  await hide(true)
  await lapse(15_000, 3000, 150)
  await hide(false)
  await pause(400)
}
await pause(1500)
await caption('Close interruptions are grouped. You decide what each one was.')
await scroll(520)
const header = page.getByRole('button', { name: /3 short interruptions/ })
await click(header)
await pause(2500)
await click(header)
await caption('Label them all at once, or one by one. They clear a minute after you label them.')
await click(page.getByRole('button', { name: 'Mark all as Distraction' }))
await pause(2500)
await lapse(61_000, 5_000, 90)
await pause(1500)
await scroll(0)

await caption('Taking a break? Declare it. Detection pauses and the break time is kept separate.')
await click(page.getByRole('button', { name: 'Take a break' }))
await pause(1500)
await moveTo(page.getByLabel('10 minutes'))
await page.getByLabel('10 minutes').check()
await pause(800)
await click(page.getByRole('button', { name: 'Start break' }))
await pause(2500)
await caption('Break mode puts the countdown first. Task timers keep running, quietly.')
await lapse(2 * 60_000, 6_000, 70)
await pause(1500)
await click(page.getByRole('button', { name: '+5 min' }))
await pause(1500)
await lapse(60_000, 6_000, 70)
await click(page.getByRole('button', { name: 'End break' }))
await pause(2000)

await caption('Finish a task and it moves to Done with its total time.')
await click(page.getByRole('button', { name: 'Complete Study for the exam' }))
await pause(3000)

await caption('Analytics: time on finished tasks, on-time completion, and a separate breaks summary.')
await click(page.getByRole('button', { name: 'Analytics' }))
await pause(2500)
await scroll(300)
await moveTo(page.getByTestId('chart-bucket').last())
await pause(2800)
await scroll(900)
await pause(2200)
await scroll(0)

await caption('Settings: thresholds, notification sound (even your own), export, import and delete.')
await click(page.getByRole('button', { name: 'Settings' }))
await pause(3500)
await scroll(400)
await pause(2500)

await caption('NoCrast. React, TypeScript, Vite and IndexedDB. Private by design.')
await scroll(0)
await pause(4200)
await caption('')

await client.send('Page.stopScreencast')
await Promise.all(writes)
await context.close()
await browser.close()

// Keep each frame on screen until the next one arrives, then encode.
const list =
  frames.map((f, i) => `file '${f.name}'\nduration ${Math.max(0.01, (frames[i + 1]?.t ?? f.t + 1) - f.t).toFixed(3)}`).join('\n') +
  `\nfile '${frames.at(-1).name}'\n`
writeFileSync(`${RAW}/frames.txt`, list)
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg'
const run = (args) => {
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error('ffmpeg failed. Install ffmpeg or set FFMPEG to its path.')
}
run([
  '-f',
  'concat',
  '-i',
  `${RAW}/frames.txt`,
  '-vf',
  'fps=25,format=yuv420p',
  '-c:v',
  'libx264',
  '-crf',
  '23',
  '-preset',
  'medium',
  '-movflags',
  '+faststart',
  `${OUT}/nocrast-demo.mp4`,
])
run([
  '-i',
  `${OUT}/nocrast-demo.mp4`,
  '-vf',
  'fps=8,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
  `${OUT}/nocrast-demo.gif`,
])
rmSync(RAW, { recursive: true, force: true })
console.log(`Saved ${OUT}/nocrast-demo.mp4 and ${OUT}/nocrast-demo.gif (${frames.length} frames)`)
