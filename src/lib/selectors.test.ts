import { describe, expect, it, vi } from 'vitest'
import {
  clientStats,
  entriesForTask,
  entryMinutes,
  minutesByDay,
  openTasksSorted,
  projectStats,
  runningEntry,
  sumMinutes,
  tasksForProject,
} from './selectors'
import { makeClient, makeData, makeEntry, makeProject, makeTask } from '../test/factories'

const NOW = new Date('2026-03-15T12:00:00.000Z').getTime()

describe('entryMinutes', () => {
  it('מחשב משך של רישום סגור', () => {
    expect(entryMinutes(makeEntry('2026-03-15T09:00:00.000Z', 90))).toBe(90)
  })

  it('מודד רישום פתוח עד לרגע הנוכחי', () => {
    const entry = makeEntry('2026-03-15T11:00:00.000Z', null)
    expect(entryMinutes(entry, NOW)).toBe(60)
  })

  it('מחזיר 0 לתאריך פגום במקום NaN', () => {
    expect(entryMinutes(makeEntry('לא תאריך', 30))).toBe(0)
  })
})

describe('runningEntry', () => {
  it('מאתר את הרישום הפתוח היחיד', () => {
    const closed = makeEntry('2026-03-15T09:00:00.000Z', 30)
    const open = makeEntry('2026-03-15T11:00:00.000Z', null)
    expect(runningEntry([closed, open])?.id).toBe(open.id)
    expect(runningEntry([closed])).toBeUndefined()
  })
})

describe('projectStats', () => {
  it('סוכם זמן שנרשם ומפריד זמן לחיוב', () => {
    const project = makeProject({ id: 'p_x' })
    const data = makeData({
      projects: [project],
      timeEntries: [
        makeEntry('2026-03-15T09:00:00.000Z', 60, { projectId: 'p_x' }),
        makeEntry('2026-03-15T10:00:00.000Z', 30, { projectId: 'p_x', billable: false }),
      ],
    })

    const stats = projectStats(data, project, NOW)
    expect(stats.spentMinutes).toBe(90)
    expect(stats.billableMinutes).toBe(60)
  })

  it('נופל להערכת המשימות כשאין הערכה ברמת הפרויקט', () => {
    const project = makeProject({ id: 'p_x', estimateHours: undefined })
    const data = makeData({
      projects: [project],
      tasks: [
        makeTask({ projectId: 'p_x', estimateMinutes: 60 }),
        makeTask({ projectId: 'p_x', estimateMinutes: 30 }),
      ],
    })

    expect(projectStats(data, project, NOW).estimateMinutes).toBe(90)
  })

  it('מעדיף את הערכת הפרויקט על פני סכום המשימות', () => {
    const project = makeProject({ id: 'p_x', estimateHours: 10 })
    const data = makeData({
      projects: [project],
      tasks: [makeTask({ projectId: 'p_x', estimateMinutes: 60 })],
    })

    expect(projectStats(data, project, NOW).estimateMinutes).toBe(600)
  })

  it('מחשב אחוז התקדמות לפי משימות שהושלמו', () => {
    const project = makeProject({ id: 'p_x' })
    const data = makeData({
      projects: [project],
      tasks: [
        makeTask({ projectId: 'p_x', status: 'done' }),
        makeTask({ projectId: 'p_x', status: 'todo' }),
        makeTask({ projectId: 'p_x', status: 'doing' }),
        makeTask({ projectId: 'p_x', status: 'done' }),
      ],
    })

    const stats = projectStats(data, project, NOW)
    expect(stats.tasksDone).toBe(2)
    expect(stats.tasksTotal).toBe(4)
    expect(stats.progress).toBe(50)
  })

  it('לא מתרסק על פרויקט בלי משימות', () => {
    const project = makeProject({ id: 'p_x' })
    const stats = projectStats(makeData({ projects: [project] }), project, NOW)
    expect(stats.progress).toBe(0)
    expect(stats.estimateMinutes).toBe(0)
  })

  it('מחשב תעריף בפועל = מחיר חלקי שעות', () => {
    const project = makeProject({ id: 'p_x', price: 8000 })
    const data = makeData({
      projects: [project],
      timeEntries: [makeEntry('2026-03-15T08:00:00.000Z', 600, { projectId: 'p_x' })],
    })

    // 8000 ₪ על 10 שעות = 800 ₪ לשעה
    expect(projectStats(data, project, NOW).effectiveRate).toBe(800)
  })

  it('לא מחשב תעריף כשאין מחיר או כשאין שעות (מניעת חלוקה באפס)', () => {
    const noPrice = makeProject({ id: 'p_a' })
    const noHours = makeProject({ id: 'p_b', price: 5000 })
    const data = makeData({
      projects: [noPrice, noHours],
      timeEntries: [makeEntry('2026-03-15T08:00:00.000Z', 60, { projectId: 'p_a' })],
    })

    expect(projectStats(data, noPrice, NOW).effectiveRate).toBeUndefined()
    expect(projectStats(data, noHours, NOW).effectiveRate).toBeUndefined()
  })

  it('מעדיף את תעריף היעד של הלקוח על ברירת המחדל', () => {
    const client = makeClient({ id: 'c_x', hourlyRate: 400 })
    const project = makeProject({ id: 'p_x', clientId: 'c_x' })
    const data = makeData({ clients: [client], projects: [project] })
    data.settings.defaultHourlyRate = 250

    expect(projectStats(data, project, NOW).targetRate).toBe(400)
  })

  it('נופל לתעריף ברירת המחדל כשללקוח אין תעריף', () => {
    const client = makeClient({ id: 'c_x' })
    const project = makeProject({ id: 'p_x', clientId: 'c_x' })
    const data = makeData({ clients: [client], projects: [project] })
    data.settings.defaultHourlyRate = 250

    expect(projectStats(data, project, NOW).targetRate).toBe(250)
  })

  it('מסמן חריגה רק כשעברו את ההערכה', () => {
    const project = makeProject({ id: 'p_x', estimateHours: 1 })
    const under = makeData({
      projects: [project],
      timeEntries: [makeEntry('2026-03-15T08:00:00.000Z', 50, { projectId: 'p_x' })],
    })
    const over = makeData({
      projects: [project],
      timeEntries: [makeEntry('2026-03-15T08:00:00.000Z', 70, { projectId: 'p_x' })],
    })

    expect(projectStats(under, project, NOW).isOverEstimate).toBe(false)
    expect(projectStats(over, project, NOW).isOverEstimate).toBe(true)
  })

  it('מודד את משך הפרויקט עד תאריך הסיום כשהוא הושלם', () => {
    const project = makeProject({
      id: 'p_x',
      status: 'done',
      startDate: '2026-01-01T09:00:00.000Z',
      completedAt: '2026-01-31T09:00:00.000Z',
    })

    expect(projectStats(makeData({ projects: [project] }), project, NOW).elapsedDays).toBe(30)
  })

  it('מודד משך פרויקט פעיל עד היום', () => {
    const project = makeProject({ id: 'p_x', startDate: '2026-03-05T12:00:00.000Z' })
    expect(projectStats(makeData({ projects: [project] }), project, NOW).elapsedDays).toBe(10)
  })

  it('לא סופר זמן של פרויקטים אחרים', () => {
    const project = makeProject({ id: 'p_x' })
    const data = makeData({
      projects: [project],
      timeEntries: [
        makeEntry('2026-03-15T09:00:00.000Z', 60, { projectId: 'p_x' }),
        makeEntry('2026-03-15T09:00:00.000Z', 999, { projectId: 'p_other' }),
      ],
    })

    expect(projectStats(data, project, NOW).spentMinutes).toBe(60)
  })
})

describe('clientStats', () => {
  it('מסכם פרויקטים, שעות והכנסות ללקוח', () => {
    const client = makeClient({ id: 'c_x' })
    const data = makeData({
      clients: [client],
      projects: [
        makeProject({ id: 'p_1', clientId: 'c_x', status: 'active', price: 5000 }),
        makeProject({ id: 'p_2', clientId: 'c_x', status: 'done', price: 3000 }),
        makeProject({ id: 'p_3', clientId: 'c_other', price: 9999 }),
      ],
      timeEntries: [
        makeEntry('2026-03-15T08:00:00.000Z', 120, { projectId: 'p_1' }),
        makeEntry('2026-03-15T08:00:00.000Z', 120, { projectId: 'p_2' }),
        makeEntry('2026-03-15T08:00:00.000Z', 600, { projectId: 'p_3' }),
      ],
      tasks: [
        makeTask({ projectId: 'p_1', status: 'todo' }),
        makeTask({ projectId: 'p_1', status: 'done' }),
        makeTask({ projectId: 'p_3', status: 'todo' }),
      ],
    })

    const stats = clientStats(data, client, NOW)
    expect(stats.projectsTotal).toBe(2)
    expect(stats.projectsActive).toBe(1)
    expect(stats.projectsDone).toBe(1)
    expect(stats.spentMinutes).toBe(240)
    expect(stats.revenue).toBe(8000)
    expect(stats.openTasks).toBe(1)
    expect(stats.effectiveRate).toBe(2000) // 8000 ₪ על 4 שעות
  })
})

describe('openTasksSorted', () => {
  it('מסנן משימות שהושלמו ומשימות של פרויקטים סגורים', () => {
    const data = makeData({
      projects: [
        makeProject({ id: 'p_open', status: 'active' }),
        makeProject({ id: 'p_done', status: 'done' }),
      ],
      tasks: [
        makeTask({ projectId: 'p_open', title: 'פתוחה' }),
        makeTask({ projectId: 'p_open', title: 'הושלמה', status: 'done' }),
        makeTask({ projectId: 'p_done', title: 'בפרויקט סגור' }),
      ],
    })

    expect(openTasksSorted(data).map((t) => t.title)).toEqual(['פתוחה'])
  })

  it('ממיין לפי תאריך יעד, ואז לפי עדיפות', () => {
    const data = makeData({
      projects: [makeProject({ id: 'p_x' })],
      tasks: [
        makeTask({ projectId: 'p_x', title: 'בלי יעד', priority: 'high' }),
        makeTask({ projectId: 'p_x', title: 'מאוחר', dueDate: '2026-05-01T00:00:00.000Z' }),
        makeTask({ projectId: 'p_x', title: 'מוקדם', dueDate: '2026-03-01T00:00:00.000Z' }),
      ],
    })

    expect(openTasksSorted(data).map((t) => t.title)).toEqual(['מוקדם', 'מאוחר', 'בלי יעד'])
  })

  it('מעדיף עדיפות גבוהה כשאין תאריך יעד', () => {
    const data = makeData({
      projects: [makeProject({ id: 'p_x' })],
      tasks: [
        makeTask({ projectId: 'p_x', title: 'נמוכה', priority: 'low', order: 0 }),
        makeTask({ projectId: 'p_x', title: 'גבוהה', priority: 'high', order: 1 }),
      ],
    })

    expect(openTasksSorted(data)[0].title).toBe('גבוהה')
  })
})

describe('tasksForProject', () => {
  it('מחזיר משימות של הפרויקט לפי סדר התצוגה', () => {
    const tasks = [
      makeTask({ projectId: 'p_x', title: 'שנייה', order: 1 }),
      makeTask({ projectId: 'p_x', title: 'ראשונה', order: 0 }),
      makeTask({ projectId: 'p_other', title: 'אחר', order: 0 }),
    ]

    expect(tasksForProject(tasks, 'p_x').map((t) => t.title)).toEqual(['ראשונה', 'שנייה'])
  })
})

describe('entriesForTask', () => {
  it('מסנן רישומים לפי משימה', () => {
    const entries = [
      makeEntry('2026-03-15T08:00:00.000Z', 30, { taskId: 't_1' }),
      makeEntry('2026-03-15T09:00:00.000Z', 30, { taskId: 't_2' }),
      makeEntry('2026-03-15T10:00:00.000Z', 30, { taskId: null }),
    ]

    expect(sumMinutes(entriesForTask(entries, 't_1'))).toBe(30)
  })
})

describe('minutesByDay', () => {
  it('משייך רישום לפי היום המקומי ולא לפי UTC', () => {
    // שעה 23:30 מקומית — ב-UTC זה כבר עלול להיות היום הבא
    vi.useFakeTimers()
    const today = new Date(2026, 2, 15, 12, 0)
    vi.setSystemTime(today)

    const lateNight = new Date(2026, 2, 15, 23, 30)
    const entries = [makeEntry(lateNight.toISOString(), 30)]
    const buckets = minutesByDay(entries, 7, today.getTime())

    expect(buckets).toHaveLength(7)
    // הרישום חייב ליפול על היום האחרון בטווח, שהוא היום
    expect(buckets[buckets.length - 1].minutes).toBe(30)
    expect(buckets.slice(0, -1).every((b) => b.minutes === 0)).toBe(true)
  })

  it('מתעלם מרישומים מחוץ לטווח ומתאריכים פגומים', () => {
    const today = new Date(2026, 2, 15, 12, 0)
    const old = new Date(2026, 1, 1, 10, 0)
    const entries = [makeEntry(old.toISOString(), 60), makeEntry('לא תאריך', 60)]

    const buckets = minutesByDay(entries, 7, today.getTime())
    expect(buckets.every((b) => b.minutes === 0)).toBe(true)
  })
})
