import type { AppData } from '../types'
import { BUILTIN_TEMPLATES } from '../data/templates'

const STORAGE_KEY = 'rkwbd.studio-manager.v1'
const DATA_VERSION = 1

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    clients: [],
    projects: [],
    tasks: [],
    timeEntries: [],
    templates: BUILTIN_TEMPLATES.map((t) => ({ ...t, items: [...t.items] })),
    settings: {
      businessName: 'הסטודיו שלי',
      defaultHourlyRate: 250,
      currency: '₪',
      workdayHours: 8,
    },
  }
}

/** ממזג נתונים שנטענו מהאחסון עם ברירות המחדל, כדי שגרסאות ישנות לא יישברו */
function migrate(raw: unknown): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Partial<AppData>

  const templates = Array.isArray(data.templates) ? data.templates : []
  // מוודא שתבניות מובנות חדשות נוספות גם למשתמשים ותיקים
  const missingBuiltins = base.templates.filter(
    (b) => !templates.some((t) => t.id === b.id),
  )

  return {
    version: DATA_VERSION,
    clients: Array.isArray(data.clients) ? data.clients : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    timeEntries: Array.isArray(data.timeEntries) ? data.timeEntries : [],
    templates: [...templates, ...missingBuiltins],
    settings: { ...base.settings, ...(data.settings ?? {}) },
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    return migrate(JSON.parse(raw))
  } catch (err) {
    console.error('טעינת הנתונים נכשלה, מתחילים מנתונים ריקים', err)
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('שמירת הנתונים נכשלה', err)
  }
}

export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `studio-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImport(text: string): AppData {
  return migrate(JSON.parse(text))
}

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const escape = (cell: string | number) => {
    const s = String(cell ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n')
  // BOM כדי שאקסל יזהה עברית ב-UTF-8
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
