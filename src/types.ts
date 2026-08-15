// מודל הנתונים של המערכת
// כל הישויות נשמרות ב-localStorage תחת מפתח אחד (ראה lib/storage.ts)

export type ID = string

/** לקוח של הסטודיו */
export interface Client {
  id: ID
  name: string
  company?: string
  email?: string
  phone?: string
  notes?: string
  /** תעריף שעתי ברירת מחדל ללקוח (₪). משמש לחישוב רווחיות כשאין מחיר קבוע לפרויקט */
  hourlyRate?: number
  color: string
  archived: boolean
  createdAt: string
}

export type ProjectStatus = 'lead' | 'active' | 'paused' | 'review' | 'done'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  lead: 'ליד / הצעת מחיר',
  active: 'בעבודה',
  paused: 'מושהה',
  review: 'ממתין ללקוח',
  done: 'הושלם',
}

/** פרויקט = אתר אחד שבונים ללקוח */
export interface Project {
  id: ID
  clientId: ID
  name: string
  description?: string
  status: ProjectStatus
  /** מחיר הפרויקט שסוכם עם הלקוח (₪) */
  price?: number
  /** הערכת שעות ראשונית לכל הפרויקט */
  estimateHours?: number
  startDate?: string
  dueDate?: string
  /** מתמלא אוטומטית כשהסטטוס עובר ל"הושלם" */
  completedAt?: string
  createdAt: string
}

export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'לביצוע',
  doing: 'בתהליך',
  done: 'הושלם',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'נמוכה',
  normal: 'רגילה',
  high: 'גבוהה',
}

/** משימה בתוך פרויקט */
export interface Task {
  id: ID
  projectId: ID
  title: string
  notes?: string
  /** שלב בתהליך העבודה, למשל "אפיון" או "עיצוב" */
  stage?: string
  status: TaskStatus
  priority: TaskPriority
  /** הערכת זמן בדקות */
  estimateMinutes?: number
  dueDate?: string
  order: number
  createdAt: string
  completedAt?: string
}

/** רישום זמן. end === null פירושו טיימר שרץ כרגע */
export interface TimeEntry {
  id: ID
  projectId: ID
  taskId: ID | null
  start: string
  end: string | null
  note?: string
  billable: boolean
}

/** תבנית משימות שחוזרת על עצמה לכל לקוח חדש */
export interface TemplateItem {
  title: string
  stage: string
  estimateMinutes?: number
  priority?: TaskPriority
}

export interface Template {
  id: ID
  name: string
  description?: string
  items: TemplateItem[]
  /** תבניות מובנות לא ניתנות למחיקה */
  builtin?: boolean
}

export interface Settings {
  businessName: string
  /** תעריף שעתי כללי, ברירת מחדל כשאין תעריף ללקוח (₪) */
  defaultHourlyRate: number
  currency: string
  /** שעות עבודה ליום — משמש להערכת ימי עבודה בדוחות */
  workdayHours: number
}

export interface AppData {
  version: number
  clients: Client[]
  projects: Project[]
  tasks: Task[]
  timeEntries: TimeEntry[]
  templates: Template[]
  settings: Settings
}
