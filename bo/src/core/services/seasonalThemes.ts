export interface SeasonalTheme {
  key: string
  label: string
  emoji: string
  hubPath: string
  hubLabel: string
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  articleSlugPrefix: string
  signal: string
  scriptCommand: string
}

export const SEASONAL_THEMES: SeasonalTheme[] = [
  {
    key: 'terrasse-ete',
    label: 'Terrasse été',
    emoji: '☀',
    hubPath: '/themes/terrasse-ete',
    hubLabel: 'Hub terrasse été',
    startMonth: 4,
    startDay: 1,
    endMonth: 9,
    endDay: 30,
    articleSlugPrefix: 'terrasse-',
    signal: 'terrasse',
    scriptCommand: 'node --env-file=.env scripts/build-terrasse-internal-links.mjs',
  },
  {
    key: 'cosy-hiver',
    label: 'Cosy hiver',
    emoji: '❄',
    hubPath: '/themes/cosy-hiver',
    hubLabel: 'Hub cosy hiver',
    startMonth: 10,
    startDay: 1,
    endMonth: 3,
    endDay: 31,
    articleSlugPrefix: 'cosy-',
    signal: 'ambiance',
    scriptCommand: 'node --env-file=.env scripts/build-cosy-internal-links.mjs',
  },
]

function dayOfYear(month: number, day: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let n = day
  for (let i = 0; i < month - 1; i++) n += daysInMonth[i]
  return n
}

export function getActiveTheme(date: Date = new Date()): SeasonalTheme | null {
  const today = dayOfYear(date.getMonth() + 1, date.getDate())
  for (const t of SEASONAL_THEMES) {
    const start = dayOfYear(t.startMonth, t.startDay)
    const end = dayOfYear(t.endMonth, t.endDay)
    if (start <= end) {
      if (today >= start && today <= end) return t
    } else {
      if (today >= start || today <= end) return t
    }
  }
  return null
}

export function getNextTheme(date: Date = new Date()): { theme: SeasonalTheme, daysUntil: number } | null {
  const active = getActiveTheme(date)
  if (!active) return null
  const idx = SEASONAL_THEMES.findIndex(t => t.key === active.key)
  const next = SEASONAL_THEMES[(idx + 1) % SEASONAL_THEMES.length]

  const year = date.getFullYear()
  let switchDate = new Date(year, next.startMonth - 1, next.startDay)
  if (switchDate < date) {
    switchDate = new Date(year + 1, next.startMonth - 1, next.startDay)
  }
  const daysUntil = Math.ceil((switchDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  return { theme: next, daysUntil }
}

export function formatDateRange(theme: SeasonalTheme): string {
  const months = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  return `${theme.startDay} ${months[theme.startMonth - 1]} → ${theme.endDay} ${months[theme.endMonth - 1]}`
}
