import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Bars, Card, CardHead, Empty, Progress, Stat } from '../components/ui'
import { ClientDot, DueBadge } from '../components/bits'
import { TimeEntryModal } from '../components/modals'
import {
  minutesByDay,
  openTasksSorted,
  projectStats,
  sumMinutes,
} from '../lib/selectors'
import { formatHours, formatMinutes, formatMoney } from '../lib/utils'
import type { Route } from '../routes'

export function Dashboard({ navigate }: { navigate: (route: Route) => void }) {
  const { data, startTimer, toggleTask } = useStore()
  const [timeModal, setTimeModal] = useState(false)
  const now = Date.now()

  const stats = useMemo(() => {
    const activeProjects = data.projects.filter(
      (p) => p.status === 'active' || p.status === 'review',
    )

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000)

    const todayMinutes = sumMinutes(
      data.timeEntries.filter((e) => new Date(e.start) >= todayStart),
      now,
    )
    const weekMinutes = sumMinutes(
      data.timeEntries.filter((e) => new Date(e.start) >= weekStart),
      now,
    )

    const openValue = activeProjects.reduce((acc, p) => acc + (p.price ?? 0), 0)
    const openTasks = openTasksSorted(data)
    const overdue = openTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < todayStart,
    ).length

    return {
      activeProjects,
      todayMinutes,
      weekMinutes,
      openValue,
      openTasks,
      overdue,
      chart: minutesByDay(data.timeEntries, 14, now),
    }
  }, [data, now])

  const hasAnything = data.clients.length > 0 || data.projects.length > 0

  if (!hasAnything) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1 className="page-title">ברוך הבא 👋</h1>
            <div className="page-sub">בוא נתחיל להזין את הלקוחות והפרויקטים שלך</div>
          </div>
        </div>
        <Card>
          <Empty icon="🚀" title="אין עדיין נתונים במערכת">
            <div className="stack" style={{ maxWidth: 420, margin: '14px auto 0' }}>
              <p>
                המערכת עובדת בשלושה צעדים: מוסיפים לקוח, פותחים לו פרויקט עם תבנית משימות
                מוכנה, ומפעילים טיימר על כל משימה שעובדים עליה.
              </p>
              <button
                className="btn btn-primary btn-block"
                onClick={() => navigate({ name: 'clients' })}
              >
                ➕ להוספת הלקוח הראשון
              </button>
            </div>
          </Empty>
        </Card>
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">סקירה כללית</h1>
          <div className="page-sub">
            {data.settings.businessName} · {new Date().toLocaleDateString('he-IL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setTimeModal(true)}>
            ⏱ רישום זמן ידני
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate({ name: 'projects' })}
          >
            ➕ פרויקט חדש
          </button>
        </div>
      </div>

      <div className="stack">
        <div className="grid grid-stats">
          <Stat
            label="נרשם היום"
            value={formatMinutes(stats.todayMinutes)}
            hint={`השבוע: ${formatHours(stats.weekMinutes)} שעות`}
            tone="accent"
          />
          <Stat
            label="פרויקטים פעילים"
            value={stats.activeProjects.length}
            hint={`מתוך ${data.projects.length} בסך הכל`}
          />
          <Stat
            label="משימות פתוחות"
            value={stats.openTasks.length}
            hint={stats.overdue > 0 ? `${stats.overdue} באיחור` : 'הכל בזמן'}
            tone={stats.overdue > 0 ? 'red' : 'green'}
          />
          <Stat
            label="שווי פרויקטים פתוחים"
            value={formatMoney(stats.openValue, data.settings.currency)}
            hint="סכום המחירים של פרויקטים בעבודה"
            tone="purple"
          />
        </div>

        <div className="grid grid-2">
          <Card>
            <CardHead
              title="פרויקטים בעבודה"
              action={
                <button
                  className="link-btn small"
                  onClick={() => navigate({ name: 'projects' })}
                >
                  לכל הפרויקטים
                </button>
              }
            />
            {stats.activeProjects.length === 0 ? (
              <Empty icon="📁" title="אין פרויקטים פעילים" />
            ) : (
              <div>
                {stats.activeProjects.slice(0, 6).map((project) => {
                  const s = projectStats(data, project, now)
                  return (
                    <div
                      key={project.id}
                      className="task-row clickable"
                      onClick={() => navigate({ name: 'project', id: project.id })}
                    >
                      <ClientDot client={s.client} />
                      <div className="task-main">
                        <div className="task-title">{project.name}</div>
                        <div className="task-meta">
                          <span>{s.client?.name ?? 'ללא לקוח'}</span>
                          <span>·</span>
                          <span>
                            {s.tasksDone}/{s.tasksTotal} משימות
                          </span>
                          <span>·</span>
                          <span>{formatHours(s.spentMinutes)} שע׳</span>
                          {project.dueDate && <DueBadge date={project.dueDate} />}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <Progress
                            value={s.progress}
                            tone={s.isOverEstimate ? 'amber' : 'green'}
                          />
                        </div>
                      </div>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          startTimer(project.id, null)
                        }}
                      >
                        ▶
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHead
              title="המשימות הדחופות שלי"
              action={
                <button
                  className="link-btn small"
                  onClick={() => navigate({ name: 'tasks' })}
                >
                  לכל המשימות
                </button>
              }
            />
            {stats.openTasks.length === 0 ? (
              <Empty icon="✅" title="אין משימות פתוחות" />
            ) : (
              <div>
                {stats.openTasks.slice(0, 7).map((task) => {
                  const project = data.projects.find((p) => p.id === task.projectId)
                  const client = data.clients.find((c) => c.id === project?.clientId)
                  return (
                    <div key={task.id} className="task-row">
                      <button
                        className="task-check"
                        onClick={() => toggleTask(task.id)}
                        aria-label="סימון כהושלם"
                      >
                        ✓
                      </button>
                      <div
                        className="task-main clickable"
                        onClick={() =>
                          project && navigate({ name: 'project', id: project.id })
                        }
                      >
                        <div className="task-title">{task.title}</div>
                        <div className="task-meta">
                          <ClientDot client={client} />
                          <span>{client?.name ?? '—'}</span>
                          <span>·</span>
                          <span>{project?.name}</span>
                          <DueBadge date={task.dueDate} />
                        </div>
                      </div>
                      <button
                        className="btn btn-sm"
                        onClick={() => project && startTimer(project.id, task.id)}
                      >
                        ▶
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHead
            title="שעות עבודה ב-14 הימים האחרונים"
            action={
              <span className="small faint">
                סה״כ {formatHours(stats.chart.reduce((a, b) => a + b.minutes, 0))} שעות
              </span>
            }
          />
          <div className="card-pad">
            <Bars
              data={stats.chart.map((bucket) => ({
                ...bucket,
                title: formatMinutes(bucket.minutes),
              }))}
            />
          </div>
        </Card>
      </div>

      {timeModal && <TimeEntryModal onClose={() => setTimeModal(false)} />}
    </>
  )
}
