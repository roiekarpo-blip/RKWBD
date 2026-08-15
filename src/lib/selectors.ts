import type { AppData, Client, Project, Task, TimeEntry } from '../types'
import { daysBetween } from './utils'

/** משך רישום זמן בדקות. רישום שרץ נמדד עד "עכשיו" */
export function entryMinutes(entry: TimeEntry, now = Date.now()): number {
  const start = new Date(entry.start).getTime()
  const end = entry.end ? new Date(entry.end).getTime() : now
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.max(0, (end - start) / 60000)
}

export function runningEntry(entries: TimeEntry[]): TimeEntry | undefined {
  return entries.find((e) => e.end === null)
}

export function sumMinutes(entries: TimeEntry[], now = Date.now()): number {
  return entries.reduce((acc, e) => acc + entryMinutes(e, now), 0)
}

export function entriesForProject(entries: TimeEntry[], projectId: string): TimeEntry[] {
  return entries.filter((e) => e.projectId === projectId)
}

export function entriesForTask(entries: TimeEntry[], taskId: string): TimeEntry[] {
  return entries.filter((e) => e.taskId === taskId)
}

export function tasksForProject(tasks: Task[], projectId: string): Task[] {
  return tasks
    .filter((t) => t.projectId === projectId)
    .sort((a, b) => a.order - b.order)
}

export interface ProjectStats {
  project: Project
  client?: Client
  /** זמן שנרשם בפועל, בדקות */
  spentMinutes: number
  /** זמן מחויב (billable) בלבד */
  billableMinutes: number
  /** הערכת זמן: מהפרויקט אם הוגדרה, אחרת סכום הערכות המשימות */
  estimateMinutes: number
  tasksTotal: number
  tasksDone: number
  /** אחוז השלמה לפי משימות */
  progress: number
  price?: number
  /** ₪ לשעה בפועל = מחיר / שעות שנרשמו */
  effectiveRate?: number
  /** תעריף היעד של הלקוח או ברירת המחדל */
  targetRate: number
  /** רווח/הפסד מול תעריף היעד */
  rateDelta?: number
  /** ימי לוח מתחילת העבודה ועד הסיום (או עד היום) */
  elapsedDays: number
  isOverEstimate: boolean
}

export function projectStats(data: AppData, project: Project, now = Date.now()): ProjectStats {
  const client = data.clients.find((c) => c.id === project.clientId)
  const entries = entriesForProject(data.timeEntries, project.id)
  const tasks = tasksForProject(data.tasks, project.id)

  const spentMinutes = sumMinutes(entries, now)
  const billableMinutes = sumMinutes(entries.filter((e) => e.billable), now)

  const taskEstimate = tasks.reduce((acc, t) => acc + (t.estimateMinutes ?? 0), 0)
  const estimateMinutes = project.estimateHours ? project.estimateHours * 60 : taskEstimate

  const tasksTotal = tasks.length
  const tasksDone = tasks.filter((t) => t.status === 'done').length
  const progress = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100)

  const hours = spentMinutes / 60
  const effectiveRate = project.price && hours > 0 ? project.price / hours : undefined
  const targetRate = client?.hourlyRate ?? data.settings.defaultHourlyRate

  const startRef = project.startDate ?? project.createdAt
  const endRef = project.completedAt ?? new Date(now).toISOString()
  const elapsedDays = daysBetween(startRef, endRef)

  return {
    project,
    client,
    spentMinutes,
    billableMinutes,
    estimateMinutes,
    tasksTotal,
    tasksDone,
    progress,
    price: project.price,
    effectiveRate,
    targetRate,
    rateDelta: effectiveRate === undefined ? undefined : effectiveRate - targetRate,
    elapsedDays,
    isOverEstimate: estimateMinutes > 0 && spentMinutes > estimateMinutes,
  }
}

export interface ClientStats {
  client: Client
  projectsTotal: number
  projectsActive: number
  projectsDone: number
  spentMinutes: number
  revenue: number
  effectiveRate?: number
  openTasks: number
}

export function clientStats(data: AppData, client: Client, now = Date.now()): ClientStats {
  const projects = data.projects.filter((p) => p.clientId === client.id)
  const projectIds = new Set(projects.map((p) => p.id))
  const entries = data.timeEntries.filter((e) => projectIds.has(e.projectId))
  const spentMinutes = sumMinutes(entries, now)
  const revenue = projects.reduce((acc, p) => acc + (p.price ?? 0), 0)
  const hours = spentMinutes / 60
  const openTasks = data.tasks.filter(
    (t) => projectIds.has(t.projectId) && t.status !== 'done',
  ).length

  return {
    client,
    projectsTotal: projects.length,
    projectsActive: projects.filter((p) => p.status === 'active').length,
    projectsDone: projects.filter((p) => p.status === 'done').length,
    spentMinutes,
    revenue,
    effectiveRate: hours > 0 && revenue > 0 ? revenue / hours : undefined,
    openTasks,
  }
}

/** משימות פתוחות בכל המערכת, ממוינות לפי דחיפות ותאריך יעד */
export function openTasksSorted(data: AppData): Task[] {
  const priorityWeight = { high: 0, normal: 1, low: 2 } as const
  const activeProjectIds = new Set(
    data.projects.filter((p) => p.status !== 'done').map((p) => p.id),
  )
  return data.tasks
    .filter((t) => t.status !== 'done' && activeProjectIds.has(t.projectId))
    .sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
      if (aDue !== bDue) return aDue - bDue
      const pw = priorityWeight[a.priority] - priorityWeight[b.priority]
      if (pw !== 0) return pw
      return a.order - b.order
    })
}

/** מפתח יום לפי השעון המקומי (ולא UTC), כדי שרישומי ערב לא ייפלו ליום הבא */
function localDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** סכימת דקות לפי יום עבור טווח תאריכים */
export function minutesByDay(
  entries: TimeEntry[],
  days: number,
  now = Date.now(),
): { key: string; label: string; minutes: number }[] {
  const buckets: { key: string; label: string; minutes: number }[] = []
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    buckets.push({
      key: localDayKey(d),
      label: d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
      minutes: 0,
    })
  }

  const index = new Map(buckets.map((b, i) => [b.key, i]))
  for (const entry of entries) {
    const started = new Date(entry.start)
    if (Number.isNaN(started.getTime())) continue
    const i = index.get(localDayKey(started))
    if (i !== undefined) buckets[i].minutes += entryMinutes(entry, now)
  }
  return buckets
}
