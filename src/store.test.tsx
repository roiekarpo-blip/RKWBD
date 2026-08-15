import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StoreProvider, useStore } from './store'
import { runningEntry } from './lib/selectors'

const wrapper = ({ children }: { children: ReactNode }) => (
  <StoreProvider>{children}</StoreProvider>
)

const setup = () => renderHook(() => useStore(), { wrapper })

describe('לקוחות', () => {
  it('מוסיף לקוח עם מזהה וצבע', () => {
    const { result } = setup()
    act(() => {
      result.current.addClient({ name: 'דנה' })
    })

    expect(result.current.data.clients).toHaveLength(1)
    expect(result.current.data.clients[0].name).toBe('דנה')
    expect(result.current.data.clients[0].color).toMatch(/^#/)
  })

  it('מחיקת לקוח מוחקת גם פרויקטים, משימות ורישומי זמן שלו', () => {
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      const other = result.current.addClient({ name: 'לקוח אחר' })
      const project = result.current.addProject({ name: 'אתר', clientId: client.id })
      result.current.addProject({ name: 'אתר אחר', clientId: other.id })
      result.current.addTask({ title: 'משימה', projectId: project.id })
      result.current.startTimer(project.id)
      result.current.stopTimer()
    })

    const clientId = result.current.data.clients[0].id
    act(() => result.current.deleteClient(clientId))

    expect(result.current.data.clients).toHaveLength(1)
    expect(result.current.data.projects).toHaveLength(1)
    expect(result.current.data.projects[0].name).toBe('אתר אחר')
    // המשימות ורישומי הזמן של הלקוח שנמחק לא נשארים יתומים
    expect(result.current.data.tasks).toHaveLength(0)
    expect(result.current.data.timeEntries).toHaveLength(0)
  })
})

describe('פרויקטים', () => {
  it('רושם תאריך סיום אוטומטית כשעוברים לסטטוס "הושלם"', () => {
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      result.current.addProject({ name: 'אתר', clientId: client.id })
    })

    const id = result.current.data.projects[0].id
    expect(result.current.data.projects[0].completedAt).toBeUndefined()

    act(() => result.current.updateProject(id, { status: 'done' }))
    expect(result.current.data.projects[0].completedAt).toBeTruthy()
  })

  it('מנקה את תאריך הסיום כשפותחים מחדש פרויקט שהושלם', () => {
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      result.current.addProject({ name: 'אתר', clientId: client.id })
    })

    const id = result.current.data.projects[0].id
    act(() => result.current.updateProject(id, { status: 'done' }))
    act(() => result.current.updateProject(id, { status: 'active' }))

    expect(result.current.data.projects[0].completedAt).toBeUndefined()
  })

  it('לא דורס את תאריך הסיום בעריכה שאינה משנה סטטוס', () => {
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      result.current.addProject({ name: 'אתר', clientId: client.id })
    })

    const id = result.current.data.projects[0].id
    act(() => result.current.updateProject(id, { status: 'done' }))
    const completedAt = result.current.data.projects[0].completedAt

    act(() => result.current.updateProject(id, { price: 5000 }))
    expect(result.current.data.projects[0].completedAt).toBe(completedAt)
  })
})

describe('תבניות משימות', () => {
  it('החלת תבנית יוצרת את כל המשימות לפי הסדר', () => {
    const { result } = setup()
    let projectId = ''
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      projectId = result.current.addProject({ name: 'אתר', clientId: client.id }).id
    })

    const template = result.current.data.templates.find((t) => t.id === 'tpl-landing')!
    act(() => {
      result.current.applyTemplate(projectId, template.id)
    })

    const tasks = result.current.data.tasks.filter((t) => t.projectId === projectId)
    expect(tasks).toHaveLength(template.items.length)
    expect(tasks.map((t) => t.order)).toEqual(template.items.map((_, i) => i))
    expect(tasks[0].title).toBe(template.items[0].title)
    expect(tasks.every((t) => t.status === 'todo')).toBe(true)
  })

  it('החלת תבנית שנייה מוסיפה בהמשך ולא דורסת משימות קיימות', () => {
    const { result } = setup()
    let projectId = ''
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      projectId = result.current.addProject({ name: 'אתר', clientId: client.id }).id
      result.current.addTask({ title: 'משימה ידנית', projectId })
    })

    act(() => {
      result.current.applyTemplate(projectId, 'tpl-maintenance')
    })

    const tasks = result.current.data.tasks
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => a.order - b.order)

    expect(tasks[0].title).toBe('משימה ידנית')
    expect(tasks).toHaveLength(1 + 6)
    // סדרי התצוגה נשארים ייחודיים ורציפים
    expect(new Set(tasks.map((t) => t.order)).size).toBe(tasks.length)
  })

  it('יוצר תבנית מפרויקט קיים', () => {
    const { result } = setup()
    let projectId = ''
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      projectId = result.current.addProject({ name: 'אתר', clientId: client.id }).id
      result.current.addTask({ title: 'אפיון', projectId, stage: 'אפיון' })
      result.current.addTask({ title: 'עיצוב', projectId, stage: 'עיצוב' })
    })

    act(() => {
      result.current.createTemplateFromProject(projectId, 'התהליך שלי')
    })

    const created = result.current.data.templates.find((t) => t.name === 'התהליך שלי')
    expect(created?.items.map((i) => i.title)).toEqual(['אפיון', 'עיצוב'])
  })

  it('לא מוחק תבניות מובנות', () => {
    const { result } = setup()
    const before = result.current.data.templates.length

    act(() => result.current.deleteTemplate('tpl-landing'))
    expect(result.current.data.templates).toHaveLength(before)
  })
})

describe('משימות', () => {
  it('סימון משימה כהושלמה ובחזרה מעדכן תאריך סיום', () => {
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      const project = result.current.addProject({ name: 'אתר', clientId: client.id })
      result.current.addTask({ title: 'משימה', projectId: project.id })
    })

    const id = result.current.data.tasks[0].id

    act(() => result.current.toggleTask(id))
    expect(result.current.data.tasks[0].status).toBe('done')
    expect(result.current.data.tasks[0].completedAt).toBeTruthy()

    act(() => result.current.toggleTask(id))
    expect(result.current.data.tasks[0].status).toBe('todo')
    expect(result.current.data.tasks[0].completedAt).toBeUndefined()
  })

  it('מחיקת משימה משאירה את רישומי הזמן ומנתקת אותם ממנה', () => {
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      const project = result.current.addProject({ name: 'אתר', clientId: client.id })
      const task = result.current.addTask({ title: 'משימה', projectId: project.id })
      result.current.addTimeEntry({
        projectId: project.id,
        taskId: task.id,
        start: '2026-03-15T09:00:00.000Z',
        end: '2026-03-15T10:00:00.000Z',
        billable: true,
      })
    })

    const taskId = result.current.data.tasks[0].id
    act(() => result.current.deleteTask(taskId))

    // הזמן שהושקע לא נעלם מסיכומי הפרויקט
    expect(result.current.data.timeEntries).toHaveLength(1)
    expect(result.current.data.timeEntries[0].taskId).toBeNull()
  })

  it('מחליף סדר בין משימות סמוכות', () => {
    const { result } = setup()
    let projectId = ''
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      projectId = result.current.addProject({ name: 'אתר', clientId: client.id }).id
      result.current.addTask({ title: 'ראשונה', projectId })
      result.current.addTask({ title: 'שנייה', projectId })
    })

    const second = result.current.data.tasks.find((t) => t.title === 'שנייה')!
    act(() => result.current.moveTask(second.id, -1))

    const ordered = [...result.current.data.tasks].sort((a, b) => a.order - b.order)
    expect(ordered.map((t) => t.title)).toEqual(['שנייה', 'ראשונה'])
  })

  it('התעלמות מהזזה מעבר לקצה הרשימה', () => {
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      const project = result.current.addProject({ name: 'אתר', clientId: client.id })
      result.current.addTask({ title: 'יחידה', projectId: project.id })
    })

    const id = result.current.data.tasks[0].id
    act(() => result.current.moveTask(id, -1))
    expect(result.current.data.tasks[0].title).toBe('יחידה')
  })
})

describe('טיימר', () => {
  it('הפעלת טיימר חדש עוצרת את הקודם — רק טיימר אחד רץ בכל רגע', () => {
    const { result } = setup()
    let a = ''
    let b = ''
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      a = result.current.addProject({ name: 'אתר א', clientId: client.id }).id
      b = result.current.addProject({ name: 'אתר ב', clientId: client.id }).id
    })

    act(() => result.current.startTimer(a))
    act(() => result.current.startTimer(b))

    const open = result.current.data.timeEntries.filter((e) => e.end === null)
    expect(open).toHaveLength(1)
    expect(open[0].projectId).toBe(b)
    expect(result.current.data.timeEntries).toHaveLength(2)
  })

  it('עצירה מיד אחרי הפעלה מוחקת את הרישום (לחיצה בטעות)', () => {
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      const project = result.current.addProject({ name: 'אתר', clientId: client.id })
      result.current.startTimer(project.id)
    })

    act(() => result.current.stopTimer())
    expect(result.current.data.timeEntries).toHaveLength(0)
  })

  it('שומר רישום שנמשך יותר מכמה שניות', () => {
    vi.useFakeTimers()
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      const project = result.current.addProject({ name: 'אתר', clientId: client.id })
      result.current.startTimer(project.id)
    })

    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000)
      result.current.stopTimer()
    })

    expect(result.current.data.timeEntries).toHaveLength(1)
    expect(runningEntry(result.current.data.timeEntries)).toBeUndefined()
  })

  it('מקשר את הטיימר למשימה כשמפעילים ממנה', () => {
    const { result } = setup()
    act(() => {
      const client = result.current.addClient({ name: 'דנה' })
      const project = result.current.addProject({ name: 'אתר', clientId: client.id })
      const task = result.current.addTask({ title: 'משימה', projectId: project.id })
      result.current.startTimer(project.id, task.id)
    })

    expect(result.current.data.timeEntries[0].taskId).toBe(result.current.data.tasks[0].id)
  })
})

describe('שמירה מקומית', () => {
  it('שומר ל-localStorage ומשחזר בטעינה מחדש', () => {
    const first = setup()
    act(() => {
      first.result.current.addClient({ name: 'דנה' })
    })
    first.unmount()

    // מופע חדש קורא את מה שנשמר
    const second = setup()
    expect(second.result.current.data.clients.map((c) => c.name)).toEqual(['דנה'])
  })

  it('איפוס מחזיר למצב התחלתי עם התבניות המובנות', () => {
    const { result } = setup()
    act(() => {
      result.current.addClient({ name: 'דנה' })
    })

    act(() => result.current.resetData())

    expect(result.current.data.clients).toHaveLength(0)
    expect(result.current.data.templates.length).toBeGreaterThan(0)
  })
})
