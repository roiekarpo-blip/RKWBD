import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Bars, Card, CardHead, Empty, HBar, Stat } from '../components/ui'
import { StatusBadge } from '../components/bits'
import { entryMinutes, projectStats } from '../lib/selectors'
import { downloadCsv } from '../lib/storage'
import {
  formatDate,
  formatHours,
  formatMinutes,
  formatMoney,
  monthKey,
  monthLabel,
  pickColor,
} from '../lib/utils'

type Scope = 'all' | 'done' | 'open'

export function ReportsPage() {
  const { data } = useStore()
  const [scope, setScope] = useState<Scope>('all')
  const now = Date.now()
  const currency = data.settings.currency

  const report = useMemo(() => {
    const projects = data.projects.filter((p) => {
      if (scope === 'done') return p.status === 'done'
      if (scope === 'open') return p.status !== 'done'
      return true
    })

    const stats = projects
      .map((p) => projectStats(data, p, now))
      .sort((a, b) => b.spentMinutes - a.spentMinutes)

    const totalMinutes = stats.reduce((a, s) => a + s.spentMinutes, 0)
    const totalRevenue = stats.reduce((a, s) => a + (s.price ?? 0), 0)
    const avgRate = totalMinutes > 0 ? totalRevenue / (totalMinutes / 60) : 0

    // ממוצע משך פרויקט — רק לפרויקטים שהושלמו, שם המדידה אמיתית
    const completed = stats.filter((s) => s.project.status === 'done')
    const avgDays = completed.length
      ? completed.reduce((a, s) => a + s.elapsedDays, 0) / completed.length
      : 0
    const avgHours = completed.length
      ? completed.reduce((a, s) => a + s.spentMinutes, 0) / completed.length / 60
      : 0

    // דיוק ההערכות: כמה אחוז מהזמן המוערך נוצל בפועל
    const withEstimate = stats.filter((s) => s.estimateMinutes > 0)
    const accuracy = withEstimate.length
      ? (withEstimate.reduce((a, s) => a + s.spentMinutes / s.estimateMinutes, 0) /
          withEstimate.length) *
        100
      : 0

    // שעות לפי לקוח
    const byClient = new Map<string, number>()
    for (const s of stats) {
      const key = s.client?.id ?? 'none'
      byClient.set(key, (byClient.get(key) ?? 0) + s.spentMinutes)
    }
    const clientRows = [...byClient.entries()]
      .map(([id, minutes]) => ({
        id,
        name: data.clients.find((c) => c.id === id)?.name ?? 'ללא לקוח',
        color: data.clients.find((c) => c.id === id)?.color,
        minutes,
      }))
      .filter((r) => r.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)

    // שעות לפי שלב בתהליך — לאן באמת הולך הזמן
    const projectIds = new Set(projects.map((p) => p.id))
    const byStage = new Map<string, number>()
    for (const entry of data.timeEntries) {
      if (!projectIds.has(entry.projectId)) continue
      const task = data.tasks.find((t) => t.id === entry.taskId)
      const stage = task?.stage ?? 'לא משויך לשלב'
      byStage.set(stage, (byStage.get(stage) ?? 0) + entryMinutes(entry, now))
    }
    const stageRows = [...byStage.entries()]
      .map(([stage, minutes]) => ({ stage, minutes }))
      .sort((a, b) => b.minutes - a.minutes)

    // שעות לפי חודש
    const byMonth = new Map<string, number>()
    for (const entry of data.timeEntries) {
      if (!projectIds.has(entry.projectId)) continue
      const key = monthKey(entry.start)
      byMonth.set(key, (byMonth.get(key) ?? 0) + entryMinutes(entry, now))
    }
    const monthRows = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, minutes]) => ({ key, label: monthLabel(key), minutes }))

    return {
      stats,
      totalMinutes,
      totalRevenue,
      avgRate,
      avgDays,
      avgHours,
      accuracy,
      clientRows,
      stageRows,
      monthRows,
      completedCount: completed.length,
    }
  }, [data, scope, now])

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      [
        'לקוח',
        'פרויקט',
        'סטטוס',
        'התחלה',
        'סיום',
        'ימי לוח',
        'שעות בפועל',
        'שעות מוערכות',
        'סטייה בשעות',
        'משימות שהושלמו',
        'סה״כ משימות',
        'מחיר',
        'תעריף בפועל',
      ],
    ]
    for (const s of report.stats) {
      rows.push([
        s.client?.name ?? '',
        s.project.name,
        s.project.status,
        formatDate(s.project.startDate ?? s.project.createdAt),
        s.project.completedAt ? formatDate(s.project.completedAt) : '',
        s.elapsedDays,
        (s.spentMinutes / 60).toFixed(2),
        s.estimateMinutes ? (s.estimateMinutes / 60).toFixed(2) : '',
        s.estimateMinutes
          ? ((s.spentMinutes - s.estimateMinutes) / 60).toFixed(2)
          : '',
        s.tasksDone,
        s.tasksTotal,
        s.price ?? '',
        s.effectiveRate ? Math.round(s.effectiveRate) : '',
      ])
    }
    downloadCsv(`projects-report-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const maxClient = Math.max(1, ...report.clientRows.map((r) => r.minutes))
  const maxStage = Math.max(1, ...report.stageRows.map((r) => r.minutes))

  if (data.projects.length === 0) {
    return (
      <Card>
        <Empty icon="📊" title="אין עדיין נתונים לדוחות">
          הדוחות מתמלאים אוטומטית ככל שנרשמים זמנים על פרויקטים.
        </Empty>
      </Card>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">דוחות</h1>
          <div className="page-sub">כמה זמן באמת לקח כל פרויקט, ומה זה שווה בשעה</div>
        </div>
        <div className="row">
          <button className="btn" onClick={exportCsv}>
            ⬇ ייצוא CSV
          </button>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        {(
          [
            ['all', 'כל הפרויקטים'],
            ['done', 'שהושלמו'],
            ['open', 'פתוחים'],
          ] as [Scope, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`chip ${scope === key ? 'active' : ''}`}
            onClick={() => setScope(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="stack">
        <div className="grid grid-stats">
          <Stat
            label="סה״כ שעות"
            value={formatHours(report.totalMinutes)}
            hint={`${report.stats.length} פרויקטים`}
            tone="accent"
          />
          <Stat
            label="סה״כ הכנסות"
            value={formatMoney(report.totalRevenue, currency)}
            hint="לפי מחירי הפרויקטים"
            tone="purple"
          />
          <Stat
            label="תעריף ממוצע בפועל"
            value={`${formatMoney(report.avgRate, currency)}/שע׳`}
            hint={`יעד: ${formatMoney(data.settings.defaultHourlyRate, currency)}`}
            tone={report.avgRate >= data.settings.defaultHourlyRate ? 'green' : 'red'}
          />
          <Stat
            label="משך פרויקט ממוצע"
            value={
              report.completedCount ? `${Math.round(report.avgDays)} ימים` : '—'
            }
            hint={
              report.completedCount
                ? `${report.avgHours.toFixed(1)} שעות עבודה בממוצע`
                : 'אין עדיין פרויקטים שהושלמו'
            }
          />
        </div>

        {report.accuracy > 0 && (
          <Card>
            <div className="card-pad">
              <div className="row-between">
                <div>
                  <div className="stat-label">דיוק ההערכות שלך</div>
                  <div className="small faint" style={{ marginTop: 3 }}>
                    בממוצע אתה משקיע {Math.round(report.accuracy)}% מהזמן שהערכת מראש
                  </div>
                </div>
                <div
                  className="stat-value"
                  style={{
                    color:
                      report.accuracy > 115
                        ? 'var(--red)'
                        : report.accuracy < 85
                          ? 'var(--amber)'
                          : 'var(--green)',
                  }}
                >
                  {Math.round(report.accuracy)}%
                </div>
              </div>
              <div className="small muted" style={{ marginTop: 10 }}>
                {report.accuracy > 115
                  ? '⚠ ההערכות נמוכות מדי — כדאי להעלות את ההערכות או את המחיר.'
                  : report.accuracy < 85
                    ? 'ההערכות שלך שמרניות — יש מקום לקצר לוחות זמנים ללקוח.'
                    : '✓ ההערכות שלך מדויקות. אפשר לתמחר בביטחון.'}
              </div>
            </div>
          </Card>
        )}

        <Card>
          <CardHead title="כמה זמן לקח כל פרויקט" />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>פרויקט</th>
                  <th>לקוח</th>
                  <th>סטטוס</th>
                  <th className="num">ימי לוח</th>
                  <th className="num">שעות בפועל</th>
                  <th className="num">מוערך</th>
                  <th className="num">סטייה</th>
                  <th className="num">מחיר</th>
                  <th className="num">₪ לשעה</th>
                </tr>
              </thead>
              <tbody>
                {report.stats.map((s) => {
                  const deltaMinutes =
                    s.estimateMinutes > 0 ? s.spentMinutes - s.estimateMinutes : null
                  return (
                    <tr key={s.project.id}>
                      <td className="truncate">{s.project.name}</td>
                      <td className="truncate faint">{s.client?.name ?? '—'}</td>
                      <td>
                        <StatusBadge status={s.project.status} />
                      </td>
                      <td className="num">{s.elapsedDays}</td>
                      <td className="num">{formatHours(s.spentMinutes)}</td>
                      <td className="num faint">
                        {s.estimateMinutes > 0 ? formatHours(s.estimateMinutes) : '—'}
                      </td>
                      <td className="num">
                        {deltaMinutes === null ? (
                          <span className="faint">—</span>
                        ) : (
                          <span
                            className="signed"
                            style={{
                              color: deltaMinutes > 0 ? 'var(--red)' : 'var(--green)',
                            }}
                          >
                            {deltaMinutes > 0 ? '+' : '−'}
                            {formatHours(Math.abs(deltaMinutes))}
                          </span>
                        )}
                      </td>
                      <td className="num">
                        {s.price !== undefined ? formatMoney(s.price, currency) : '—'}
                      </td>
                      <td className="num">
                        {s.effectiveRate !== undefined ? (
                          <span
                            style={{
                              color:
                                s.effectiveRate >= s.targetRate
                                  ? 'var(--green)'
                                  : 'var(--red)',
                            }}
                          >
                            {formatMoney(s.effectiveRate, currency)}
                          </span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-2">
          <Card>
            <CardHead title="שעות לפי לקוח" />
            <div className="card-pad">
              {report.clientRows.length === 0 ? (
                <Empty icon="👥" title="אין נתונים" />
              ) : (
                report.clientRows.map((row, i) => (
                  <HBar
                    key={row.id}
                    name={row.name}
                    value={row.minutes}
                    max={maxClient}
                    label={formatHours(row.minutes) + ' שע׳'}
                    color={row.color ?? pickColor(i)}
                  />
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHead title="לאן הולך הזמן — לפי שלב" />
            <div className="card-pad">
              {report.stageRows.length === 0 ? (
                <Empty icon="⏱" title="אין נתונים" />
              ) : (
                report.stageRows.map((row, i) => (
                  <HBar
                    key={row.stage}
                    name={row.stage}
                    value={row.minutes}
                    max={maxStage}
                    label={`${formatHours(row.minutes)} שע׳ · ${Math.round(
                      (row.minutes / report.totalMinutes) * 100,
                    )}%`}
                    color={pickColor(i + 2)}
                  />
                ))
              )}
            </div>
          </Card>
        </div>

        <Card>
          <CardHead title="שעות לפי חודש" />
          <div className="card-pad">
            {report.monthRows.length === 0 ? (
              <Empty icon="📅" title="אין נתונים" />
            ) : (
              <Bars
                data={report.monthRows.map((row) => ({
                  ...row,
                  title: formatMinutes(row.minutes),
                }))}
              />
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
