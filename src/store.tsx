import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppData,
  Client,
  ID,
  Project,
  Settings,
  Task,
  Template,
  TimeEntry,
} from './types'
import { emptyData, loadData, saveData } from './lib/storage'
import { pickColor, uid } from './lib/utils'
import { runningEntry } from './lib/selectors'

interface Store {
  data: AppData
  setData: (data: AppData) => void
  resetData: () => void

  addClient: (input: Partial<Client> & { name: string }) => Client
  updateClient: (id: ID, patch: Partial<Client>) => void
  deleteClient: (id: ID) => void

  addProject: (input: Partial<Project> & { name: string; clientId: ID }) => Project
  updateProject: (id: ID, patch: Partial<Project>) => void
  deleteProject: (id: ID) => void
  applyTemplate: (projectId: ID, templateId: ID) => number

  addTask: (input: Partial<Task> & { title: string; projectId: ID }) => Task
  updateTask: (id: ID, patch: Partial<Task>) => void
  deleteTask: (id: ID) => void
  toggleTask: (id: ID) => void
  moveTask: (id: ID, direction: -1 | 1) => void

  startTimer: (projectId: ID, taskId?: ID | null, note?: string) => void
  stopTimer: () => void
  addTimeEntry: (input: Omit<TimeEntry, 'id'>) => TimeEntry
  updateTimeEntry: (id: ID, patch: Partial<TimeEntry>) => void
  deleteTimeEntry: (id: ID) => void

  saveTemplate: (template: Template) => void
  deleteTemplate: (id: ID) => void
  createTemplateFromProject: (projectId: ID, name: string) => Template | null

  updateSettings: (patch: Partial<Settings>) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const update = useCallback((fn: (draft: AppData) => AppData) => {
    setDataState((prev) => fn(prev))
  }, [])

  const setData = useCallback((next: AppData) => setDataState(next), [])
  const resetData = useCallback(() => setDataState(emptyData()), [])

  // ---------- לקוחות ----------

  const addClient = useCallback<Store['addClient']>(
    (input) => {
      const client: Client = {
        id: uid('c_'),
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
        hourlyRate: input.hourlyRate,
        color: input.color ?? pickColor(Math.floor(Math.random() * 8)),
        archived: false,
        createdAt: new Date().toISOString(),
      }
      update((d) => ({ ...d, clients: [...d.clients, client] }))
      return client
    },
    [update],
  )

  const updateClient = useCallback<Store['updateClient']>(
    (id, patch) => {
      update((d) => ({
        ...d,
        clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
    },
    [update],
  )

  /** מחיקת לקוח מוחקת גם את הפרויקטים, המשימות ורישומי הזמן שלו */
  const deleteClient = useCallback<Store['deleteClient']>(
    (id) => {
      update((d) => {
        const projectIds = new Set(
          d.projects.filter((p) => p.clientId === id).map((p) => p.id),
        )
        return {
          ...d,
          clients: d.clients.filter((c) => c.id !== id),
          projects: d.projects.filter((p) => p.clientId !== id),
          tasks: d.tasks.filter((t) => !projectIds.has(t.projectId)),
          timeEntries: d.timeEntries.filter((e) => !projectIds.has(e.projectId)),
        }
      })
    },
    [update],
  )

  // ---------- פרויקטים ----------

  const addProject = useCallback<Store['addProject']>(
    (input) => {
      const project: Project = {
        id: uid('p_'),
        clientId: input.clientId,
        name: input.name,
        description: input.description,
        status: input.status ?? 'active',
        price: input.price,
        estimateHours: input.estimateHours,
        startDate: input.startDate ?? new Date().toISOString(),
        dueDate: input.dueDate,
        createdAt: new Date().toISOString(),
      }
      update((d) => ({ ...d, projects: [...d.projects, project] }))
      return project
    },
    [update],
  )

  const updateProject = useCallback<Store['updateProject']>(
    (id, patch) => {
      update((d) => ({
        ...d,
        projects: d.projects.map((p) => {
          if (p.id !== id) return p
          const next = { ...p, ...patch }
          // תאריך סיום מתעדכן אוטומטית לפי הסטטוס
          if (patch.status === 'done' && !next.completedAt) {
            next.completedAt = new Date().toISOString()
          }
          if (patch.status && patch.status !== 'done') {
            next.completedAt = undefined
          }
          return next
        }),
      }))
    },
    [update],
  )

  const deleteProject = useCallback<Store['deleteProject']>(
    (id) => {
      update((d) => ({
        ...d,
        projects: d.projects.filter((p) => p.id !== id),
        tasks: d.tasks.filter((t) => t.projectId !== id),
        timeEntries: d.timeEntries.filter((e) => e.projectId !== id),
      }))
    },
    [update],
  )

  /** מוסיף לפרויקט את כל משימות התבנית. מחזיר כמה משימות נוספו */
  const applyTemplate = useCallback<Store['applyTemplate']>(
    (projectId, templateId) => {
      let added = 0
      update((d) => {
        const template = d.templates.find((t) => t.id === templateId)
        if (!template) return d
        const existing = d.tasks.filter((t) => t.projectId === projectId)
        const startOrder = existing.reduce((max, t) => Math.max(max, t.order), -1) + 1
        const now = new Date().toISOString()
        const newTasks: Task[] = template.items.map((item, i) => ({
          id: uid('t_'),
          projectId,
          title: item.title,
          stage: item.stage,
          status: 'todo',
          priority: item.priority ?? 'normal',
          estimateMinutes: item.estimateMinutes,
          order: startOrder + i,
          createdAt: now,
        }))
        added = newTasks.length
        return { ...d, tasks: [...d.tasks, ...newTasks] }
      })
      return added
    },
    [update],
  )

  // ---------- משימות ----------

  const addTask = useCallback<Store['addTask']>(
    (input) => {
      const task: Task = {
        id: uid('t_'),
        projectId: input.projectId,
        title: input.title,
        notes: input.notes,
        stage: input.stage,
        status: input.status ?? 'todo',
        priority: input.priority ?? 'normal',
        estimateMinutes: input.estimateMinutes,
        dueDate: input.dueDate,
        order: input.order ?? 0,
        createdAt: new Date().toISOString(),
      }
      update((d) => {
        const siblings = d.tasks.filter((t) => t.projectId === input.projectId)
        const order = siblings.reduce((max, t) => Math.max(max, t.order), -1) + 1
        return { ...d, tasks: [...d.tasks, { ...task, order }] }
      })
      return task
    },
    [update],
  )

  const updateTask = useCallback<Store['updateTask']>(
    (id, patch) => {
      update((d) => ({
        ...d,
        tasks: d.tasks.map((t) => {
          if (t.id !== id) return t
          const next = { ...t, ...patch }
          if (patch.status === 'done' && !next.completedAt) {
            next.completedAt = new Date().toISOString()
          }
          if (patch.status && patch.status !== 'done') {
            next.completedAt = undefined
          }
          return next
        }),
      }))
    },
    [update],
  )

  const deleteTask = useCallback<Store['deleteTask']>(
    (id) => {
      update((d) => ({
        ...d,
        tasks: d.tasks.filter((t) => t.id !== id),
        // רישומי הזמן נשמרים אבל מתנתקים מהמשימה שנמחקה
        timeEntries: d.timeEntries.map((e) =>
          e.taskId === id ? { ...e, taskId: null } : e,
        ),
      }))
    },
    [update],
  )

  const toggleTask = useCallback<Store['toggleTask']>(
    (id) => {
      update((d) => ({
        ...d,
        tasks: d.tasks.map((t) => {
          if (t.id !== id) return t
          const done = t.status === 'done'
          return {
            ...t,
            status: done ? 'todo' : 'done',
            completedAt: done ? undefined : new Date().toISOString(),
          }
        }),
      }))
    },
    [update],
  )

  const moveTask = useCallback<Store['moveTask']>(
    (id, direction) => {
      update((d) => {
        const task = d.tasks.find((t) => t.id === id)
        if (!task) return d
        const siblings = d.tasks
          .filter((t) => t.projectId === task.projectId)
          .sort((a, b) => a.order - b.order)
        const index = siblings.findIndex((t) => t.id === id)
        const swapWith = siblings[index + direction]
        if (!swapWith) return d
        return {
          ...d,
          tasks: d.tasks.map((t) => {
            if (t.id === task.id) return { ...t, order: swapWith.order }
            if (t.id === swapWith.id) return { ...t, order: task.order }
            return t
          }),
        }
      })
    },
    [update],
  )

  // ---------- זמנים ----------

  /** מפעיל טיימר. אם כבר רץ טיימר אחר — הוא נעצר קודם */
  const startTimer = useCallback<Store['startTimer']>(
    (projectId, taskId = null, note) => {
      update((d) => {
        const now = new Date().toISOString()
        const stopped = d.timeEntries.map((e) =>
          e.end === null ? { ...e, end: now } : e,
        )
        const entry: TimeEntry = {
          id: uid('e_'),
          projectId,
          taskId: taskId ?? null,
          start: now,
          end: null,
          note,
          billable: true,
        }
        return { ...d, timeEntries: [...stopped, entry] }
      })
    },
    [update],
  )

  const stopTimer = useCallback<Store['stopTimer']>(() => {
    update((d) => {
      const now = new Date().toISOString()
      return {
        ...d,
        timeEntries: d.timeEntries
          .map((e) => (e.end === null ? { ...e, end: now } : e))
          // רישום קצר מ-3 שניות נחשב לחיצה בטעות ונמחק
          .filter((e) => {
            if (e.end === null) return true
            const ms = new Date(e.end).getTime() - new Date(e.start).getTime()
            return ms >= 3000
          }),
      }
    })
  }, [update])

  const addTimeEntry = useCallback<Store['addTimeEntry']>(
    (input) => {
      const entry: TimeEntry = { ...input, id: uid('e_') }
      update((d) => ({ ...d, timeEntries: [...d.timeEntries, entry] }))
      return entry
    },
    [update],
  )

  const updateTimeEntry = useCallback<Store['updateTimeEntry']>(
    (id, patch) => {
      update((d) => ({
        ...d,
        timeEntries: d.timeEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }))
    },
    [update],
  )

  const deleteTimeEntry = useCallback<Store['deleteTimeEntry']>(
    (id) => {
      update((d) => ({ ...d, timeEntries: d.timeEntries.filter((e) => e.id !== id) }))
    },
    [update],
  )

  // ---------- תבניות ----------

  const saveTemplate = useCallback<Store['saveTemplate']>(
    (template) => {
      update((d) => {
        const exists = d.templates.some((t) => t.id === template.id)
        return {
          ...d,
          templates: exists
            ? d.templates.map((t) => (t.id === template.id ? template : t))
            : [...d.templates, template],
        }
      })
    },
    [update],
  )

  const deleteTemplate = useCallback<Store['deleteTemplate']>(
    (id) => {
      update((d) => ({
        ...d,
        templates: d.templates.filter((t) => t.id !== id || t.builtin),
      }))
    },
    [update],
  )

  /** הופך את רשימת המשימות של פרויקט קיים לתבנית לשימוש חוזר */
  const createTemplateFromProject = useCallback<Store['createTemplateFromProject']>(
    (projectId, name) => {
      let created: Template | null = null
      update((d) => {
        const tasks = d.tasks
          .filter((t) => t.projectId === projectId)
          .sort((a, b) => a.order - b.order)
        if (tasks.length === 0) return d
        created = {
          id: uid('tpl_'),
          name,
          description: 'נוצר מפרויקט קיים',
          items: tasks.map((t) => ({
            title: t.title,
            stage: t.stage ?? 'כללי',
            estimateMinutes: t.estimateMinutes,
            priority: t.priority,
          })),
        }
        return { ...d, templates: [...d.templates, created] }
      })
      return created
    },
    [update],
  )

  const updateSettings = useCallback<Store['updateSettings']>(
    (patch) => {
      update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
    },
    [update],
  )

  const value = useMemo<Store>(
    () => ({
      data,
      setData,
      resetData,
      addClient,
      updateClient,
      deleteClient,
      addProject,
      updateProject,
      deleteProject,
      applyTemplate,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      moveTask,
      startTimer,
      stopTimer,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      saveTemplate,
      deleteTemplate,
      createTemplateFromProject,
      updateSettings,
    }),
    [
      data,
      setData,
      resetData,
      addClient,
      updateClient,
      deleteClient,
      addProject,
      updateProject,
      deleteProject,
      applyTemplate,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      moveTask,
      startTimer,
      stopTimer,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      saveTemplate,
      deleteTemplate,
      createTemplateFromProject,
      updateSettings,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore חייב להיות בתוך StoreProvider')
  return ctx
}

/** הטיימר הרץ כרגע, אם יש */
export function useRunningTimer(): TimeEntry | undefined {
  const { data } = useStore()
  return runningEntry(data.timeEntries)
}

/** טיק כל שנייה — לרענון תצוגת השעון הרץ */
export function useTicker(active: boolean): number {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return tick
}

/**
 * חותמת זמן שמתעדכנת בקצב קבוע.
 * בלי זה, משכי זמן שכוללים טיימר שרץ היו "נתקעים" על הערך של הרינדור האחרון
 * ומתעדכנים רק במקרה, כשמשהו אחר גורם לרינדור מחדש.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
