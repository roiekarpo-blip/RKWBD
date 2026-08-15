import { useMemo, useState } from 'react'
import { useNow, useStore } from '../store'
import { Card, CardHead, Empty, Stat } from '../components/ui'
import { ClientDot } from '../components/bits'
import { ConfirmModal, TimeEntryModal } from '../components/modals'
import { entryMinutes, sumMinutes } from '../lib/selectors'
import { downloadCsv } from '../lib/storage'
import { formatDateTime, formatHours, formatMinutes } from '../lib/utils'
import type { TimeEntry } from '../types'

type RangeKey = 'today' | 'week' | 'month' | 'all'

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: 'today', label: 'היום', days: 0 },
  { key: 'week', label: '7 ימים', days: 7 },
  { key: 'month', label: '30 ימים', days: 30 },
  { key: 'all', label: 'הכל', days: null },
]

export function TimeLogPage() {
  const { data, deleteTimeEntry } = useStore()
  const [range, setRange] = useState<RangeKey>('week')
  const [projectFilter, setProjectFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<TimeEntry | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<TimeEntry | undefined>()
  const now = useNow()

  const entries = useMemo(() => {
    const config = RANGES.find((r) => r.key === range)!
    let from = 0
    if (config.days !== null) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      from = start.getTime() - config.days * 86400000
    }
    return data.timeEntries
      .filter((e) => new Date(e.start).getTime() >= from)
      .filter((e) => !projectFilter || e.projectId === projectFilter)
      .sort((a, b) => b.start.localeCompare(a.start))
  }, [data.timeEntries, range, projectFilter])

  const total = sumMinutes(entries, now)
  const billable = sumMinutes(
    entries.filter((e) => e.billable),
    now,
  )

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['תאריך', 'לקוח', 'פרויקט', 'משימה', 'תיאור', 'דקות', 'שעות', 'לחיוב'],
    ]
    for (const entry of entries) {
      const project = data.projects.find((p) => p.id === entry.projectId)
      const client = data.clients.find((c) => c.id === project?.clientId)
      const task = data.tasks.find((t) => t.id === entry.taskId)
      const mins = Math.round(entryMinutes(entry, now))
      rows.push([
        formatDateTime(entry.start),
        client?.name ?? '',
        project?.name ?? '',
        task?.title ?? '',
        entry.note ?? '',
        mins,
        (mins / 60).toFixed(2),
        entry.billable ? 'כן' : 'לא',
      ])
    }
    downloadCsv(`time-log-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">יומן זמנים</h1>
          <div className="page-sub">כל רישומי הזמן — מהטיימר ומרישום ידני</div>
        </div>
        <div className="row">
          <button className="btn" onClick={exportCsv} disabled={entries.length === 0}>
            ⬇ ייצוא CSV
          </button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            ➕ רישום זמן
          </button>
        </div>
      </div>

      <div className="stack">
        <div className="grid grid-stats">
          <Stat label="סה״כ בטווח" value={formatHours(total)} hint="שעות" tone="accent" />
          <Stat
            label="לחיוב"
            value={formatHours(billable)}
            hint={`${total > 0 ? Math.round((billable / total) * 100) : 0}% מהזמן`}
            tone="green"
          />
          <Stat label="רישומים" value={entries.length} />
          <Stat
            label="ממוצע לרישום"
            value={entries.length ? formatMinutes(total / entries.length) : '—'}
          />
        </div>

        <div className="row">
          {RANGES.map((r) => (
            <button
              key={r.key}
              className={`chip ${range === r.key ? 'active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
          <div className="spacer" />
          <select
            className="select"
            style={{ width: 'auto' }}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">כל הפרויקטים</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <Card>
          <CardHead title={`${entries.length} רישומים`} />
          {entries.length === 0 ? (
            <Empty icon="⏱" title="אין רישומי זמן בטווח הזה" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>מתי</th>
                    <th>לקוח / פרויקט</th>
                    <th>משימה</th>
                    <th>תיאור</th>
                    <th className="num">משך</th>
                    <th>חיוב</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const project = data.projects.find((p) => p.id === entry.projectId)
                    const client = data.clients.find((c) => c.id === project?.clientId)
                    const task = data.tasks.find((t) => t.id === entry.taskId)
                    return (
                      <tr key={entry.id}>
                        <td className="nowrap small">{formatDateTime(entry.start)}</td>
                        <td>
                          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                            <ClientDot client={client} />
                            <div style={{ minWidth: 0 }}>
                              <div className="truncate">{project?.name ?? '—'}</div>
                              <div className="small faint truncate">
                                {client?.name ?? ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="truncate">{task?.title ?? '—'}</td>
                        <td className="truncate faint">{entry.note ?? ''}</td>
                        <td className="num">
                          {entry.end === null ? (
                            <span style={{ color: 'var(--accent)' }}>רץ…</span>
                          ) : (
                            formatMinutes(entryMinutes(entry, now))
                          )}
                        </td>
                        <td>{entry.billable ? '✓' : '—'}</td>
                        <td>
                          <div className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
                            <button
                              className="icon-btn"
                              onClick={() => setEditing(entry)}
                              disabled={entry.end === null}
                              title="עריכה"
                            >
                              ✎
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => setConfirmDelete(entry)}
                              title="מחיקה"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {modal && <TimeEntryModal onClose={() => setModal(false)} />}
      {editing && (
        <TimeEntryModal entry={editing} onClose={() => setEditing(undefined)} />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="מחיקת רישום זמן"
          message="הרישום יימחק לצמיתות והשעות יופחתו מסיכומי הפרויקט."
          onConfirm={() => deleteTimeEntry(confirmDelete.id)}
          onClose={() => setConfirmDelete(undefined)}
        />
      )}
    </>
  )
}
