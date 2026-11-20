export const MESSAGES = {
  emptyTasks: ['Nothing here. Suspiciously peaceful.', 'No tasks yet. Add one and stop negotiating.'],
  started: ['Congratulations! You actually started.', 'Focus mode activated.'],
  distraction: ['Distraction detected. Nice try.', 'You left for a bit. Welcome back.'],
  finished: ['You survived another focus session.'],
  idleTimer: ['One more minute? We both know how this ends.', 'Your future self is watching.'],
  breakActive: ['Taking a break? Good call.', "You've earned a moment to breathe.", "Relax. Your tasks aren't going anywhere."],
  breakAlmost: ['Break time is almost over.'],
  breakDone: ['Ready when you are.'],
}

export const pick = (list: string[], seed = Date.now()) => list[seed % list.length]

// Deadline warnings, from furthest to nearest. `task` is the task title.
export const DEADLINE_MESSAGES: Record<string, { title: string; body: (task: string) => string }> = {
  '1mo': { title: '1 month left', body: (t) => `"${t}" is due in about a month.` },
  '2w': { title: '2 weeks left', body: (t) => `"${t}" is due in about 2 weeks.` },
  '1w': { title: '1 week left', body: (t) => `"${t}" is due in about a week.` },
  '5d': { title: '5 days left', body: (t) => `"${t}" is due in about 5 days.` },
  '3d': { title: '3 days left', body: (t) => `"${t}" is due in about 3 days.` },
  '1d': { title: '1 day left', body: (t) => `"${t}" is due in about a day.` },
  '5h': { title: '5 hours left', body: (t) => `"${t}" is due in about 5 hours.` },
  '3h': { title: '3 hours left', body: (t) => `"${t}" is due in about 3 hours.` },
  '1h': { title: '1 hour left', body: (t) => `Only an hour left on "${t}".` },
  '30m': { title: '30 minutes left', body: (t) => `Half an hour left on "${t}". Time to wrap it up.` },
  '10m': { title: '10 minutes left', body: (t) => `10 minutes to finish "${t}".` },
  '5m': { title: '5 minutes left', body: (t) => `Nice try getting "${t}" done before the deadline! 5 minutes left.` },
  '1m': { title: '1 minute left', body: (t) => `Nice try getting "${t}" done before the deadline! 1 minute left.` },
  overdue: { title: 'Overdue', body: (t) => `"${t}" passed its deadline. Its timer keeps running.` },
}
