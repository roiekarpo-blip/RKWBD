import type { AppData, Client, Project, Task, TimeEntry } from '../types'
import { emptyData } from '../lib/storage'

let counter = 0
const nextId = (prefix: string) => `${prefix}${++counter}`

export function makeClient(patch: Partial<Client> = {}): Client {
  return {
    id: nextId('c_'),
    name: 'לקוח בדיקה',
    color: '#4f7cff',
    archived: false,
    createdAt: '2026-01-01T09:00:00.000Z',
    ...patch,
  }
}

export function makeProject(patch: Partial<Project> = {}): Project {
  return {
    id: nextId('p_'),
    clientId: 'c_1',
    name: 'פרויקט בדיקה',
    status: 'active',
    createdAt: '2026-01-01T09:00:00.000Z',
    ...patch,
  }
}

export function makeTask(patch: Partial<Task> = {}): Task {
  return {
    id: nextId('t_'),
    projectId: 'p_1',
    title: 'משימת בדיקה',
    status: 'todo',
    priority: 'normal',
    order: 0,
    createdAt: '2026-01-01T09:00:00.000Z',
    ...patch,
  }
}

/**
 * רישום זמן לפי שעת התחלה ומשך בדקות.
 * minutes === null יוצר טיימר שרץ. תאריך התחלה פגום נשמר כפי שהוא,
 * כדי שאפשר יהיה לבדוק איך הקוד מתמודד עם נתונים שבורים.
 */
export function makeEntry(
  start: string,
  minutes: number | null,
  patch: Partial<TimeEntry> = {},
): TimeEntry {
  const startMs = new Date(start).getTime()
  const end =
    minutes === null || Number.isNaN(startMs)
      ? null
      : new Date(startMs + minutes * 60000).toISOString()

  return {
    id: nextId('e_'),
    projectId: 'p_1',
    taskId: null,
    start,
    end,
    billable: true,
    ...patch,
  }
}

export function makeData(patch: Partial<AppData> = {}): AppData {
  return { ...emptyData(), ...patch }
}
