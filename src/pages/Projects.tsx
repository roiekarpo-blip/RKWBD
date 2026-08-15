import { useMemo, useState } from 'react'
import { useNow, useStore } from '../store'
import { Card, Empty, Progress } from '../components/ui'
import { ClientDot, DueBadge, StatusBadge } from '../components/bits'
import { ProjectModal } from '../components/modals'
import { projectStats } from '../lib/selectors'
import { formatDate, formatHours, formatMoney } from '../lib/utils'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '../types'
import type { Route } from '../routes'

type Filter = ProjectStatus | 'all' | 'open'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'פתוחים' },
  { key: 'all', label: 'הכל' },
  { key: 'active', label: PROJECT_STATUS_LABELS.active },
  { key: 'review', label: PROJECT_STATUS_LABELS.review },
  { key: 'lead', label: PROJECT_STATUS_LABELS.lead },
  { key: 'paused', label: PROJECT_STATUS_LABELS.paused },
  { key: 'done', label: PROJECT_STATUS_LABELS.done },
]

export function ProjectsPage({ navigate }: { navigate: (route: Route) => void }) {
  const { data, startTimer } = useStore()
  const [filter, setFilter] = useState<Filter>('open')
  const [modal, setModal] = useState(false)
  const now = useNow()

  const rows = useMemo(() => {
    return data.projects
      .filter((p) => {
        if (filter === 'all') return true
        if (filter === 'open') return p.status !== 'done'
        return p.status === filter
      })
      .map((p) => projectStats(data, p, now))
      .sort((a, b) => {
        const aDue = a.project.dueDate ? new Date(a.project.dueDate).getTime() : Infinity
        const bDue = b.project.dueDate ? new Date(b.project.dueDate).getTime() : Infinity
        if (aDue !== bDue) return aDue - bDue
        return b.project.createdAt.localeCompare(a.project.createdAt)
      })
  }, [data, filter, now])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">פרויקטים</h1>
          <div className="page-sub">
            {data.projects.filter((p) => p.status !== 'done').length} פתוחים ·{' '}
            {data.projects.filter((p) => p.status === 'done').length} הושלמו
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          ➕ פרויקט חדש
        </button>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <Empty icon="📁" title="אין פרויקטים בתצוגה הזו">
            <button className="link-btn" onClick={() => setModal(true)}>
              פתיחת פרויקט חדש
            </button>
          </Empty>
        </Card>
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>פרויקט</th>
                  <th>סטטוס</th>
                  <th>התקדמות</th>
                  <th className="num">שעות</th>
                  <th className="num">מול הערכה</th>
                  <th className="num">מחיר</th>
                  <th className="num">₪ לשעה</th>
                  <th>יעד</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const overBudget =
                    s.effectiveRate !== undefined && s.effectiveRate < s.targetRate
                  return (
                    <tr
                      key={s.project.id}
                      className="clickable"
                      onClick={() => navigate({ name: 'project', id: s.project.id })}
                    >
                      <td>
                        <div className="row" style={{ gap: 7, flexWrap: 'nowrap' }}>
                          <ClientDot client={s.client} />
                          <div style={{ minWidth: 0 }}>
                            <div className="truncate">{s.project.name}</div>
                            <div className="small faint truncate">
                              {s.client?.name ?? '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={s.project.status} />
                      </td>
                      <td style={{ minWidth: 110 }}>
                        <Progress value={s.progress} tone="green" />
                        <div className="small faint" style={{ marginTop: 3 }}>
                          {s.tasksDone}/{s.tasksTotal}
                        </div>
                      </td>
                      <td className="num">{formatHours(s.spentMinutes)}</td>
                      <td className="num">
                        {s.estimateMinutes > 0 ? (
                          <span className={s.isOverEstimate ? 'stat-value red' : undefined}
                            style={{ fontSize: 14, fontWeight: 500 }}>
                            {formatHours(s.spentMinutes)} / {formatHours(s.estimateMinutes)}
                          </span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td className="num">
                        {s.price !== undefined
                          ? formatMoney(s.price, data.settings.currency)
                          : '—'}
                      </td>
                      <td className="num">
                        {s.effectiveRate !== undefined ? (
                          <span style={{ color: overBudget ? 'var(--red)' : 'var(--green)' }}>
                            {formatMoney(s.effectiveRate, data.settings.currency)}
                          </span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td className="nowrap small">
                        {s.project.dueDate ? (
                          s.project.status === 'done' ? (
                            formatDate(s.project.completedAt)
                          ) : (
                            <DueBadge date={s.project.dueDate} />
                          )
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            startTimer(s.project.id, null)
                          }}
                          title="הפעלת טיימר"
                        >
                          ▶
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modal && (
        <ProjectModal
          onClose={() => setModal(false)}
          onCreated={(id) => navigate({ name: 'project', id })}
        />
      )}
    </>
  )
}
