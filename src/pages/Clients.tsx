import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Card, CardHead, Empty, Progress, Stat } from '../components/ui'
import { ClientDot, DueBadge, StatusBadge } from '../components/bits'
import { ClientModal, ConfirmModal, ProjectModal } from '../components/modals'
import { clientStats, projectStats } from '../lib/selectors'
import { formatHours, formatMinutes, formatMoney } from '../lib/utils'
import type { Route } from '../routes'

export function ClientsPage({ navigate }: { navigate: (route: Route) => void }) {
  const { data } = useStore()
  const [modal, setModal] = useState(false)
  const [search, setSearch] = useState('')
  const now = Date.now()

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return data.clients
      .filter(
        (c) =>
          term === '' ||
          c.name.toLowerCase().includes(term) ||
          (c.company ?? '').toLowerCase().includes(term),
      )
      .map((c) => clientStats(data, c, now))
      .sort((a, b) => b.projectsActive - a.projectsActive || b.spentMinutes - a.spentMinutes)
  }, [data, search, now])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">לקוחות</h1>
          <div className="page-sub">{data.clients.length} לקוחות במערכת</div>
        </div>
        <div className="row">
          <input
            className="input"
            style={{ width: 190 }}
            placeholder="חיפוש לקוח…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            ➕ לקוח חדש
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <Empty icon="👥" title="אין לקוחות להצגה">
            כל לקוח מרכז את הפרויקטים, המשימות והשעות שלו במקום אחד.
          </Empty>
        </Card>
      ) : (
        <div className="grid grid-cards">
          {rows.map((s) => (
            <Card
              key={s.client.id}
              onClick={() => navigate({ name: 'client', id: s.client.id })}
            >
              <div className="card-pad">
                <div className="row" style={{ marginBottom: 4 }}>
                  <ClientDot client={s.client} />
                  <strong className="truncate">{s.client.name}</strong>
                </div>
                {s.client.company && (
                  <div className="small faint truncate">{s.client.company}</div>
                )}
                <div
                  className="row"
                  style={{ marginTop: 14, gap: 18, fontSize: 13 }}
                >
                  <div>
                    <div className="faint small">פרויקטים</div>
                    <strong>
                      {s.projectsActive} / {s.projectsTotal}
                    </strong>
                  </div>
                  <div>
                    <div className="faint small">שעות</div>
                    <strong>{formatHours(s.spentMinutes)}</strong>
                  </div>
                  <div>
                    <div className="faint small">הכנסות</div>
                    <strong>{formatMoney(s.revenue, data.settings.currency)}</strong>
                  </div>
                </div>
                {s.openTasks > 0 && (
                  <div className="small muted" style={{ marginTop: 10 }}>
                    {s.openTasks} משימות פתוחות
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal && <ClientModal onClose={() => setModal(false)} />}
    </>
  )
}

export function ClientDetailPage({
  clientId,
  navigate,
}: {
  clientId: string
  navigate: (route: Route) => void
}) {
  const { data, deleteClient } = useStore()
  const [editing, setEditing] = useState(false)
  const [newProject, setNewProject] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const now = Date.now()

  const client = data.clients.find((c) => c.id === clientId)

  if (!client) {
    return (
      <Card>
        <Empty icon="🔍" title="הלקוח לא נמצא">
          <button className="link-btn" onClick={() => navigate({ name: 'clients' })}>
            חזרה לרשימת הלקוחות
          </button>
        </Empty>
      </Card>
    )
  }

  const s = clientStats(data, client, now)
  const projects = data.projects
    .filter((p) => p.clientId === client.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <>
      <div className="page-head">
        <div>
          <button className="link-btn small" onClick={() => navigate({ name: 'clients' })}>
            ← לקוחות
          </button>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            <ClientDot client={client} /> {client.name}
          </h1>
          <div className="page-sub">
            {[client.company, client.phone, client.email].filter(Boolean).join(' · ') ||
              'ללא פרטי קשר'}
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setEditing(true)}>
            ✎ עריכה
          </button>
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
            מחיקה
          </button>
          <button className="btn btn-primary" onClick={() => setNewProject(true)}>
            ➕ פרויקט
          </button>
        </div>
      </div>

      <div className="stack">
        <div className="grid grid-stats">
          <Stat label="פרויקטים" value={s.projectsTotal} hint={`${s.projectsDone} הושלמו`} />
          <Stat label="שעות שנרשמו" value={formatHours(s.spentMinutes)} tone="accent" />
          <Stat
            label="הכנסות"
            value={formatMoney(s.revenue, data.settings.currency)}
            tone="purple"
          />
          <Stat
            label="תעריף בפועל"
            value={
              s.effectiveRate
                ? `${formatMoney(s.effectiveRate, data.settings.currency)}/שע׳`
                : '—'
            }
            hint={`יעד: ${formatMoney(
              client.hourlyRate ?? data.settings.defaultHourlyRate,
              data.settings.currency,
            )}`}
            tone={
              s.effectiveRate === undefined
                ? undefined
                : s.effectiveRate >= (client.hourlyRate ?? data.settings.defaultHourlyRate)
                  ? 'green'
                  : 'red'
            }
          />
        </div>

        {client.notes && (
          <Card>
            <CardHead title="הערות" />
            <div className="card-pad muted" style={{ whiteSpace: 'pre-wrap' }}>
              {client.notes}
            </div>
          </Card>
        )}

        <Card>
          <CardHead title={`פרויקטים (${projects.length})`} />
          {projects.length === 0 ? (
            <Empty icon="📁" title="אין עדיין פרויקטים ללקוח הזה">
              <button className="link-btn" onClick={() => setNewProject(true)}>
                פתיחת הפרויקט הראשון
              </button>
            </Empty>
          ) : (
            <div>
              {projects.map((project) => {
                const ps = projectStats(data, project, now)
                return (
                  <div
                    key={project.id}
                    className="task-row clickable"
                    onClick={() => navigate({ name: 'project', id: project.id })}
                  >
                    <div className="task-main">
                      <div className="row" style={{ gap: 8 }}>
                        <span className="task-title">{project.name}</span>
                        <StatusBadge status={project.status} />
                        <DueBadge date={project.dueDate} />
                      </div>
                      <div className="task-meta">
                        <span>
                          {ps.tasksDone}/{ps.tasksTotal} משימות
                        </span>
                        <span>·</span>
                        <span>{formatMinutes(ps.spentMinutes)}</span>
                        {ps.price !== undefined && (
                          <>
                            <span>·</span>
                            <span>{formatMoney(ps.price, data.settings.currency)}</span>
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <Progress value={ps.progress} tone="green" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {editing && <ClientModal client={client} onClose={() => setEditing(false)} />}
      {newProject && (
        <ProjectModal
          defaultClientId={client.id}
          onClose={() => setNewProject(false)}
          onCreated={(id) => navigate({ name: 'project', id })}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="מחיקת לקוח"
          message={`מחיקת "${client.name}" תמחק גם את כל הפרויקטים, המשימות ורישומי הזמן שלו. הפעולה אינה הפיכה.`}
          onConfirm={() => {
            deleteClient(client.id)
            navigate({ name: 'clients' })
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
