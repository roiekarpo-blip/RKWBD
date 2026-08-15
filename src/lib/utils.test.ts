import { describe, expect, it } from 'vitest'
import {
  daysBetween,
  daysUntil,
  formatClock,
  formatHours,
  formatMinutes,
  parseDuration,
  parseNumber,
  toDateInput,
} from './utils'

describe('formatMinutes', () => {
  it('מציג דקות בלבד מתחת לשעה', () => {
    expect(formatMinutes(45)).toBe("45 דק'")
    expect(formatMinutes(0)).toBe("0 דק'")
  })

  it('מציג שעות:דקות מעל שעה, עם ריפוד אפס', () => {
    expect(formatMinutes(95)).toBe("1:35 שע'")
    expect(formatMinutes(65)).toBe("1:05 שע'")
    expect(formatMinutes(120)).toBe("2:00 שע'")
  })

  it('מעגל שברי דקות ולא מחזיר ערך שלילי', () => {
    expect(formatMinutes(45.4)).toBe("45 דק'")
    expect(formatMinutes(-10)).toBe("0 דק'")
  })
})

describe('formatClock', () => {
  it('מפרמט שניות לשעון רץ', () => {
    expect(formatClock(0)).toBe('00:00:00')
    expect(formatClock(65)).toBe('00:01:05')
    expect(formatClock(3725)).toBe('01:02:05')
  })

  it('ממשיך מעל 24 שעות במקום להתאפס', () => {
    expect(formatClock(90000)).toBe('25:00:00')
  })
})

describe('formatHours', () => {
  it('ממיר דקות לשעות עשרוניות', () => {
    expect(formatHours(90)).toBe('1.5')
    expect(formatHours(0)).toBe('0.0')
  })
})

describe('parseDuration', () => {
  it('קורא מספר דקות פשוט', () => {
    expect(parseDuration('90')).toBe(90)
  })

  it('קורא פורמט שעות:דקות', () => {
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('0:45')).toBe(45)
    expect(parseDuration('2:05')).toBe(125)
  })

  it('מחזיר undefined לקלט ריק או לא תקין', () => {
    expect(parseDuration('')).toBeUndefined()
    expect(parseDuration('   ')).toBeUndefined()
    expect(parseDuration('אבג')).toBeUndefined()
    expect(parseDuration('1:אב')).toBeUndefined()
  })
})

describe('parseNumber', () => {
  it('מבדיל בין ריק לבין אפס', () => {
    expect(parseNumber('')).toBeUndefined()
    expect(parseNumber('0')).toBe(0)
    expect(parseNumber('1500')).toBe(1500)
    expect(parseNumber('לא מספר')).toBeUndefined()
  })
})

describe('daysBetween', () => {
  it('סופר ימים שלמים בין תאריכים', () => {
    expect(daysBetween('2026-01-01T00:00:00Z', '2026-01-11T00:00:00Z')).toBe(10)
  })

  it('לא מחזיר ערך שלילי כשהסדר הפוך', () => {
    expect(daysBetween('2026-01-11T00:00:00Z', '2026-01-01T00:00:00Z')).toBe(0)
  })

  it('מחזיר 0 לתאריך לא תקין', () => {
    expect(daysBetween('לא תאריך', '2026-01-01T00:00:00Z')).toBe(0)
  })
})

describe('daysUntil', () => {
  it('מחזיר 0 להיום ומספר שלילי לתאריך שעבר', () => {
    const today = new Date()
    expect(daysUntil(today.toISOString())).toBe(0)

    const yesterday = new Date(today.getTime() - 86400000)
    expect(daysUntil(yesterday.toISOString())).toBe(-1)

    const nextWeek = new Date(today.getTime() + 7 * 86400000)
    expect(daysUntil(nextWeek.toISOString())).toBe(7)
  })

  it('מחזיר null כשאין תאריך', () => {
    expect(daysUntil(undefined)).toBeNull()
    expect(daysUntil(null)).toBeNull()
  })
})

describe('toDateInput', () => {
  it('מחזיר תאריך מקומי בפורמט של שדה קלט', () => {
    // נבנה מתאריך מקומי כדי שהבדיקה לא תישבר לפי אזור זמן
    const local = new Date(2026, 2, 15, 13, 30)
    expect(toDateInput(local.toISOString())).toBe('2026-03-15')
  })

  it('מחזיר מחרוזת ריקה כשאין ערך', () => {
    expect(toDateInput(undefined)).toBe('')
    expect(toDateInput('לא תאריך')).toBe('')
  })
})
