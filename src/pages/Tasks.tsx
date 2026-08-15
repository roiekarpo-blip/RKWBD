import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Card, CardHead, Empty } from '../components/ui'
import { ClientDot, DueBadge, PriorityBadge } from '../components/bits'
import { entriesForTask, openTasksSorted, sumMinutes } from '../lib/selectors'
import { formatMinutes } from '../lib/utils'
import type { Route } from '../routes'

type Grouping = 'client' | 'stage' | 'due'

/** מסך "מה צריך לעשות" — כל המשימות הפתוחות בכל הלקוחות */
export function TasksPage({ navigate }: { navigate: (route: Route) => void }) {
  const { data, toggleTask, startTimer } = useStore()
  const [grouping, setGrouping] = useState<Grouping>('client')
  const [clientFilter, setClientFilter] = useState('')
  const now = Date.now()

  const tasks = useMemo(() => {
    const open = openTasksSorted(data)
    if (!clientFilter) return open
    const projectIds = new Set(
      data.projects.filter((p) => p.clientId === clientFilter).map((p) => p.id),
    )
    return open.filter((t) => projectIds.has(t.projectId))
  }, [data, clientFilter])

  const groups = useMemo(() => {
    const map = new Map<string, typeof tasks>()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    for (const task of tasks) {
      let key: string
      if (grouping === 'stage') {
        key = task.stage ?? 'כללי'
      } else if (grouping === 'due') {
        if (!task.dueDate) key = 'ללא תאריך יעד'
        else {
          const due = new Date(task.dueDate)
          const diff = Math.round((due.getTime() - todayStart.getTime()) / 86400000)
          if (diff < 0) key = 'באיחור'
          else if (diff === 0) key = 'היום'
          else if (diff <= 7) key = 'השבוע'
          else key = 'בהמשך'
        }
      } else {
        const project = data.projects.find((p) => p.id === task.projectId)
        const client = data.clients.find((c) => c.id === project?.clientId)
        key = client?.name ?? 'ללא לקוח'
      }
      const list = map.get(key) ?? []
      list.push(task)
      map.set(key, list)
    }

    const order = ['באיחור', 'היום', 'השבוע', 'בהמשך', 'ללא תאריך יעד']
    return [...map.entries()].sort((a, b) => {
      if (grouping === 'due') return order.indexOf(a[0]) - order.indexOf(b[0])
      return b[1].length - a[1].length
    })
  }, [tasks, grouping, data])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">משימות פתוחות</h1>
          <div className="page-sub">
            {tasks.length} משימות ממתינות · מה צריך לעשות לכל לקוח
          </div>
        </div>
        <div className="row">
          <select
            className="select"
            style={{ width: 'auto' }}
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="">כל הלקוחות</option>
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <span className="small faint">קיבוץ לפי:</span>
        {(
          [
            ['client', 'לקוח'],
            ['stage', 'שלב'],
            ['due', 'תאריך יעד'],
          ] as [Grouping, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`chip ${grouping === key ? 'active' : ''}`}
            onClick={() => setGrouping(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Card>
          <Empty icon="🎉" title="אין משימות פתוחות">
            כל המשימות בפרויקטים הפעילים הושלמו.
          </Empty>
        </Card>
      ) : (
        <div className="stack">
          {groups.map(([groupName, items]) => {
            const estimate = items.reduce((a, t) => a + (t.estimateMinutes ?? 0), 0)
            return (
              <Card key={groupName}>
                <CardHead
                  title={
                    <span className="row" style={{ gap: 8 }}>
                      {groupName}
                      <span className="badge">{items.length}</span>
                    </span>
                  }
                  action={
                    estimate > 0 ? (
                      <span className="small faint">
                        הערכה: {formatMinutes(estimate)}
                      </span>
                    ) : undefined
                  }
                />
                {items.map((task) => {
                  const project = data.projects.find((p) => p.id === task.projectId)
                  const client = data.clients.find((c) => c.id === project?.clientId)
                  const spent = sumMinutes(entriesForTask(data.timeEntries, task.id), now)
                  return (
                    <div className="task-row" key={task.id}>
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
                        <div className="row" style={{ gap: 7, flexWrap: 'nowrap' }}>
                          <span className="task-title">{task.title}</span>
                          <PriorityBadge priority={task.priority} />
                        </div>
                        <div className="task-meta">
                          <ClientDot client={client} />
                          <span>{client?.name ?? '—'}</span>
                          <span>·</span>
                          <span>{project?.name}</span>
                          {task.stage && grouping !== 'stage' && (
                            <>
                              <span>·</span>
                              <span>{task.stage}</span>
                            </>
                          )}
                          {spent > 0 && (
                            <>
                              <span>·</span>
                              <span>{formatMinutes(spent)}</span>
                            </>
                          )}
                          <DueBadge date={task.dueDate} />
                        </div>
                      </div>
                      <button
                        className="btn btn-sm"
                        onClick={() => project && startTimer(project.id, task.id)}
                        title="הפעלת טיימר"
                      >
                        ▶
                      </button>
                    </div>
                  )
                })}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
