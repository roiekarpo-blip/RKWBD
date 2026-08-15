export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `${prefix}${Date.now().toString(36)}${rand}`
}

/** מפרמט דקות לתצוגה עברית: 95 -> "1:35 שע'" */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} דק'`
  return `${h}:${String(m).padStart(2, '0')} שע'`
}

/** מפרמט שניות לשעון רץ: 3725 -> "01:02:05" */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

export function formatMoney(amount: number, currency = '₪'): string {
  const rounded = Math.round(amount)
  return `${currency}${rounded.toLocaleString('he-IL')}`
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** ערך ל-<input type="date"> */
export function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

/** ערך ל-<input type="datetime-local"> */
export function toDateTimeInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

/** מספר ימים שלמים בין שני תאריכים */
export function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / 86400000))
}

/** כמה ימים נשארו עד התאריך (שלילי = באיחור) */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' })
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const PALETTE = [
  '#4f7cff',
  '#e0567a',
  '#2fae7f',
  '#f0a12e',
  '#8b5cf6',
  '#0ea5b7',
  '#ef6f3c',
  '#6b8f2e',
]

export function pickColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}

export function parseNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

/** הופך "1:30" או "90" או "1.5ש" לדקות */
export function parseDuration(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  if (trimmed.includes(':')) {
    const [h, m] = trimmed.split(':')
    const hours = Number(h)
    const mins = Number(m)
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return undefined
    return Math.round(hours * 60 + mins)
  }
  const n = Number(trimmed)
  return Number.isFinite(n) ? Math.round(n) : undefined
}
