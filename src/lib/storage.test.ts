import { describe, expect, it, vi } from 'vitest'
import { emptyData, loadData, parseImport, saveData } from './storage'
import { makeClient, makeProject } from '../test/factories'

describe('emptyData', () => {
  it('מגיע עם התבניות המובנות והגדרות ברירת מחדל', () => {
    const data = emptyData()
    expect(data.templates.length).toBeGreaterThanOrEqual(4)
    expect(data.templates.every((t) => t.builtin)).toBe(true)
    expect(data.settings.currency).toBe('₪')
    expect(data.settings.defaultHourlyRate).toBeGreaterThan(0)
  })

  it('מחזיר עותק חדש בכל קריאה כדי שלא ידרסו זה את זה', () => {
    const a = emptyData()
    const b = emptyData()
    a.templates[0].items.push({ title: 'זיהום', stage: 'בדיקה' })
    expect(b.templates[0].items.some((i) => i.title === 'זיהום')).toBe(false)
  })
})

describe('loadData / saveData', () => {
  it('שומר ומשחזר נתונים במחזור מלא', () => {
    const data = emptyData()
    data.clients = [makeClient({ name: 'דנה' })]
    data.projects = [makeProject({ name: 'אתר' })]
    saveData(data)

    const loaded = loadData()
    expect(loaded.clients[0].name).toBe('דנה')
    expect(loaded.projects[0].name).toBe('אתר')
  })

  it('מחזיר נתונים ריקים כשאין כלום באחסון', () => {
    localStorage.clear()
    expect(loadData().clients).toEqual([])
  })

  it('לא מתרסק על JSON פגום ומחזיר נתונים ריקים', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('rkwbd.studio-manager.v1', '{לא JSON תקין')

    expect(loadData().clients).toEqual([])
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('מיגרציה של נתונים ישנים', () => {
  it('משלים שדות חסרים בלי לאבד את הנתונים הקיימים', () => {
    const partial = JSON.stringify({ clients: [makeClient({ name: 'דנה' })] })
    const migrated = parseImport(partial)

    expect(migrated.clients[0].name).toBe('דנה')
    expect(migrated.projects).toEqual([])
    expect(migrated.tasks).toEqual([])
    expect(migrated.timeEntries).toEqual([])
    expect(migrated.settings.defaultHourlyRate).toBeGreaterThan(0)
  })

  it('מוסיף תבניות מובנות חדשות למשתמש ותיק בלי לכפול קיימות', () => {
    const old = JSON.stringify({
      templates: [{ id: 'tpl-landing', name: 'דף נחיתה ישן', items: [] }],
    })
    const migrated = parseImport(old)

    const landing = migrated.templates.filter((t) => t.id === 'tpl-landing')
    expect(landing).toHaveLength(1)
    // הגרסה של המשתמש נשמרת ולא נדרסת
    expect(landing[0].name).toBe('דף נחיתה ישן')
    // ותבניות מובנות אחרות נוספו
    expect(migrated.templates.some((t) => t.id === 'tpl-website-full')).toBe(true)
  })

  it('שומר הגדרות של המשתמש וממזג עם ברירות מחדל חדשות', () => {
    const migrated = parseImport(JSON.stringify({ settings: { defaultHourlyRate: 500 } }))

    expect(migrated.settings.defaultHourlyRate).toBe(500)
    expect(migrated.settings.currency).toBe('₪')
    expect(migrated.settings.workdayHours).toBeGreaterThan(0)
  })

  it('מתעלם משדות שאינם מערכים במקום להתרסק', () => {
    const migrated = parseImport(JSON.stringify({ clients: 'לא מערך', projects: null }))
    expect(migrated.clients).toEqual([])
    expect(migrated.projects).toEqual([])
  })

  it('מייבא קובץ גיבוי שיוצא מהמערכת עצמה', () => {
    const original = emptyData()
    original.clients = [makeClient({ name: 'דנה' })]
    original.settings.businessName = 'הסטודיו שלי'

    const restored = parseImport(JSON.stringify(original))
    expect(restored.clients[0].name).toBe('דנה')
    expect(restored.settings.businessName).toBe('הסטודיו שלי')
  })
})
