import { expect, test } from '@playwright/test'

test('task timer starts on creation, runs past the deadline, stops when done, persists', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Title').fill('Write report')
  await page.getByLabel('Deadline (date and exact time)').fill('2026-11-13T10:01')
  await page.getByRole('button', { name: 'Save task' }).click()

  await page.clock.fastForward(5_000)
  await expect(page.getByRole('timer')).toHaveText(/00:00:0[4-6]/)

  await page.clock.fastForward(120_000)
  await expect(page.getByText('Overdue, still running')).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Write report' }).first()).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText(/00:02:0[4-6]/)

  await page.getByRole('button', { name: 'Complete Write report' }).click()
  const total = await page.getByText('Total time').locator('span').first().textContent()
  await page.clock.fastForward(30_000)
  await expect(page.getByText('Total time').locator('span').first()).toHaveText(total!)

  await page.reload()
  await expect(page.getByText('Write report')).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  expect((await download).suggestedFilename()).toMatch(/^nocrast-.*\.json$/)
})

test('manual break: task timer keeps running, break time is shown, break survives refresh', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Title').fill('Write report')
  await page.getByRole('button', { name: 'Save task' }).click()

  await page.getByRole('button', { name: 'Take a break' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('BREAK MODE')).toHaveCount(0)

  await page.getByRole('button', { name: 'Take a break' }).click()
  await page.getByLabel('10 minutes').check()
  await page.getByRole('button', { name: 'Start break' }).click()
  await expect(page.getByText('BREAK MODE')).toBeVisible()

  await page.clock.fastForward(60_000)
  await expect(page.getByTestId('break-countdown')).toHaveText(/00:08:5[89]|00:09:0[01]/)
  await expect(page.getByRole('timer')).toHaveText(/00:01:0[0-2]/)
  await page.getByRole('button', { name: '+5 min' }).click()

  await page.reload()
  await expect(page.getByText('BREAK MODE')).toBeVisible()

  await page.getByRole('button', { name: 'End break' }).click()
  await expect(page.getByText('BREAK MODE')).toHaveCount(0)
  await expect(page.getByText(/on breaks/).first()).toBeVisible()
})
