// Round chart tops up to an even, friendly number of minutes so the gridlines read cleanly.
const STEPS = [2, 4, 6, 10, 20, 30, 40, 60, 90, 120, 180, 240, 360, 480, 720, 960, 1440]
export const niceMax = (v: number) => STEPS.find((s) => s >= v) ?? Math.ceil(v / 480) * 480

// How many x-axis labels to skip so they stay readable: every label for a week, fewer for a day or a month.
export const labelStep = (count: number) => (count <= 8 ? 1 : count <= 14 ? 2 : count <= 24 ? 3 : 5)

// Minutes shown without a trailing .0
export const minutesText = (v: number) => String(Number(v.toFixed(1)))
