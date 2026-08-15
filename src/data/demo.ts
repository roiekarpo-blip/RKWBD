import type { AppData, Client, Project, Task, TimeEntry } from '../types'
import { emptyData } from '../lib/storage'
import { BUILTIN_TEMPLATES } from './templates'
import { pickColor, uid } from '../lib/utils'

const day = 86400000

function iso(daysAgo: number, hour = 10, minute = 0): string {
  const d = new Date(Date.now() - daysAgo * day)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/**
 * נתוני הדגמה — שלושה לקוחות בשלבים שונים, כדי שאפשר יהיה לראות
 * איך נראים הדוחות לפני שמזינים נתונים אמיתיים.
 */
export function demoData(): AppData {
  const base = emptyData()

  const clients: Client[] = [
    {
      id: 'c_demo1',
      name: 'דנה לוי',
      company: 'סטודיו דנה — עיצוב פנים',
      email: 'dana@example.co.il',
      phone: '054-1234567',
      hourlyRate: 280,
      color: pickColor(0),
      archived: false,
      createdAt: iso(75),
      notes: 'מגיבה מהר בוואטסאפ. מעדיפה עיצוב נקי ומינימליסטי.',
    },
    {
      id: 'c_demo2',
      name: 'אבי מזרחי',
      company: 'מזרחי הובלות',
      email: 'avi@example.co.il',
      phone: '052-7654321',
      hourlyRate: 250,
      color: pickColor(1),
      archived: false,
      createdAt: iso(48),
      notes: 'צריך ליווי צמוד — לא טכנולוגי. לתאם שיחות טלפון ולא מיילים.',
    },
    {
      id: 'c_demo3',
      name: 'נועה ברק',
      company: 'ברק תכשיטים',
      email: 'noa@example.co.il',
      phone: '053-9988776',
      hourlyRate: 300,
      color: pickColor(2),
      archived: false,
      createdAt: iso(20),
    },
  ]

  const projects: Project[] = [
    {
      id: 'p_demo1',
      clientId: 'c_demo1',
      name: 'אתר תדמית — סטודיו דנה',
      description: 'אתר תדמית בן 6 עמודים עם גלריית פרויקטים.',
      status: 'done',
      price: 9500,
      estimateHours: 40,
      startDate: iso(72),
      dueDate: iso(40),
      completedAt: iso(38),
      createdAt: iso(72),
    },
    {
      id: 'p_demo2',
      clientId: 'c_demo2',
      name: 'דף נחיתה — קמפיין הובלות',
      description: 'דף נחיתה לקמפיין ממומן בגוגל.',
      status: 'active',
      price: 4200,
      estimateHours: 14,
      startDate: iso(16),
      dueDate: iso(-6),
      createdAt: iso(16),
    },
    {
      id: 'p_demo3',
      clientId: 'c_demo3',
      name: 'חנות אונליין — ברק תכשיטים',
      description: 'חנות עם 80 מוצרים, סליקה ומשלוחים.',
      status: 'active',
      price: 18000,
      estimateHours: 70,
      startDate: iso(18),
      dueDate: iso(-25),
      createdAt: iso(18),
    },
    {
      id: 'p_demo4',
      clientId: 'c_demo1',
      name: 'תחזוקה חודשית — סטודיו דנה',
      status: 'active',
      price: 600,
      startDate: iso(30),
      createdAt: iso(30),
    },
  ]

  const tasks: Task[] = []
  const timeEntries: TimeEntry[] = []

  const addFromTemplate = (
    projectId: string,
    templateId: string,
    doneCount: number,
    startDaysAgo: number,
  ) => {
    const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    template.items.forEach((item, index) => {
      const isDone = index < doneCount
      const taskId = uid('t_')
      tasks.push({
        id: taskId,
        projectId,
        title: item.title,
        stage: item.stage,
        status: isDone ? 'done' : index === doneCount ? 'doing' : 'todo',
        priority: item.priority ?? 'normal',
        estimateMinutes: item.estimateMinutes,
        order: index,
        createdAt: iso(startDaysAgo),
        completedAt: isDone
          ? iso(Math.max(1, startDaysAgo - Math.round((index / template.items.length) * (startDaysAgo - 2))))
          : undefined,
      })

      if (isDone && item.estimateMinutes) {
        // זמן בפועל: בין 70% ל-135% מההערכה — כדי שהדוחות יראו סטיות אמיתיות
        const factor = 0.7 + ((index * 37) % 65) / 100
        const minutes = Math.round(item.estimateMinutes * factor)
        const daysAgo = Math.max(
          1,
          startDaysAgo - Math.round((index / template.items.length) * (startDaysAgo - 2)),
        )
        const hour = 9 + (index % 8)
        timeEntries.push({
          id: uid('e_'),
          projectId,
          taskId,
          start: iso(daysAgo, hour),
          end: new Date(new Date(iso(daysAgo, hour)).getTime() + minutes * 60000).toISOString(),
          billable: true,
        })
      }
    })
  }

  addFromTemplate('p_demo1', 'tpl-website-full', 28, 72)
  addFromTemplate('p_demo2', 'tpl-landing', 7, 16)
  addFromTemplate('p_demo3', 'tpl-ecommerce', 6, 18)
  addFromTemplate('p_demo4', 'tpl-maintenance', 4, 12)

  return {
    ...base,
    clients,
    projects,
    tasks,
    timeEntries,
    settings: {
      ...base.settings,
      businessName: 'סטודיו דוגמה',
    },
  }
}
