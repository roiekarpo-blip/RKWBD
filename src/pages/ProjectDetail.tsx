import { useMemo, useState } from 'react'
import { useNow, useRunningTimer, useStore } from '../store'
import { Card, CardHead, Empty, Field, Modal, Progress, Stat } from '../components/ui'
import { ClientDot, DueBadge, PriorityBadge, StatusBadge } from '../components/bits'
import {
  ConfirmModal,
  ProjectModal,
  TaskModal,
  TimeEntryModal,
} from '../components/modals'
import {
  entriesForProject,
  entriesForTask,
  projectStats,
  sumMinutes,
  tasksForProject,
} from '../lib/selectors'
import {
  formatDate,
  formatDateTime,
  formatHours,
  formatMinutes,
  formatMoney,
} from '../lib/utils'
import { PROJECT_STATUS_LABELS, type ProjectStatus, type Task } from '../types'
import type { Route } from '../routes'

export function ProjectDetailPage({
  projectId,
  navigate,
}: {
  projectId: string
  navigate: (route: Route) => void
}) {
  const {
    data,
    updateProject,
    deleteProject,
    startTimer,
    stopTimer,
    toggleTask,
    deleteTask,
    moveTask,
    applyTemplate,
    createTemplateFromProject,
    deleteTimeEntry,
  } = useStore()
  const running = useRunningTimer()

  const [tab, setTab] = useState<'tasks' | 'time'>('tasks')
  const [editProject, setEditProject] = useState(false)
  const [newTask, setNewTask] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [manualTime, setManualTime] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [templatePicker, setTemplatePicker] = useState(false)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [hideDone, setHideDone] = useState(false)

  const now = useNow()
  const project = data.projects.find((p) => p.id === projectId)

  const tasks = useMemo(
    () => (project ? tasksForProject(data.tasks, project.id) : []),
    [data.tasks, project],
  )

  const stages = useMemo(() => {
    const seen: string[] = []
    for (const t of tasks) {
      const stage = t.stage ?? 'כללי'
      if (!seen.includes(stage)) seen.push(stage)
    }
    return seen
  }, [tasks])

  if (!project) {
    return (
      <Card>
        <Empty icon="🔍" title="הפרויקט לא נמצא">
          <button className="link-btn" onClick={() => navigate({ name: 'projects' })}>
            חזרה לרשימת הפרויקטים
          </button>
        </Empty>
      </Card>
    )
  }

  const s = projectStats(data, project, now)
  const entries = entriesForProject(data.timeEntries, project.id).sort((a, b) =>
    b.start.localeCompare(a.start),
  )

  const visibleStages = stages
    .map((stage) => ({
      stage,
      items: tasks.filter(
        (t) => (t.stage ?? 'כללי') === stage && (!hideDone || t.status !== 'done'),
      ),
    }))
    .filter((g) => g.items.length > 0)

  const estimateVsActual =
    s.estimateMinutes > 0 ? Math.round((s.spentMinutes / s.estimateMinutes) * 100) : 0

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <button className="link-btn small" onClick={() => navigate({ name: 'projects' })}>
            ← פרויקטים
          </button>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            {project.name}
          </h1>
          <div className="page-sub row" style={{ gap: 8 }}>
            <button
              className="link-btn"
              onClick={() => navigate({ name: 'client', id: project.clientId })}
            >
              <ClientDot client={s.client} /> {s.client?.name ?? 'ללא לקוח'}
            </button>
            <StatusBadge status={project.status} />
            {project.dueDate && project.status !== 'done' && (
              <DueBadge date={project.dueDate} />
            )}
          </div>
        </div>
        <div className="row">
          <select
            className="select"
            style={{ width: 'auto' }}
            value={project.status}
            onChange={(e) =>
              updateProject(project.id, { status: e.target.value as ProjectStatus })
            }
          >
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => setEditProject(true)}>
            ✎ עריכה
          </button>
          {running?.projectId === project.id ? (
            <button className="btn btn-danger" onClick={stopTimer}>
              ⏹ עצירת טיימר
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => startTimer(project.id, null)}>
              ▶ הפעלת טיימר
            </button>
          )}
        </div>
      </div>

      <div className="stack">
        <div className="grid grid-stats">
          <Stat
            label="זמן שנרשם"
            value={formatHours(s.spentMinutes)}
            hint={
              s.estimateMinutes > 0
                ? `מתוך ${formatHours(s.estimateMinutes)} מוערכות (${estimateVsActual}%)`
                : 'ללא הערכה'
            }
            tone={s.isOverEstimate ? 'red' : 'accent'}
          />
          <Stat
            label="התקדמות"
            value={`${s.progress}%`}
            hint={`${s.tasksDone} מתוך ${s.tasksTotal} משימות`}
            tone="green"
          />
          <Stat
            label="₪ לשעה בפועל"
            value={
              s.effectiveRate
                ? formatMoney(s.effectiveRate, data.settings.currency)
                : '—'
            }
            hint={`יעד ${formatMoney(s.targetRate, data.settings.currency)}`}
            tone={
              s.rateDelta === undefined ? undefined : s.rateDelta >= 0 ? 'green' : 'red'
            }
          />
          <Stat
            label={project.status === 'done' ? 'משך הפרויקט' : 'ימים בעבודה'}
            value={`${s.elapsedDays} ימים`}
            hint={
              project.status === 'done'
                ? `הושלם ב-${formatDate(project.completedAt)}`
                : `החל ב-${formatDate(project.startDate ?? project.createdAt)}`
            }
            tone="purple"
          />
        </div>

        {s.estimateMinutes > 0 && (
          <Card>
            <div className="card-pad">
              <div className="row-between small" style={{ marginBottom: 7 }}>
                <span className="muted">ניצול מול הערכת הזמן</span>
                <span className="muted">
                  {formatMinutes(s.spentMinutes)} / {formatMinutes(s.estimateMinutes)}
                </span>
              </div>
              <Progress
                value={estimateVsActual}
                tone={
                  estimateVsActual > 100 ? 'red' : estimateVsActual > 80 ? 'amber' : 'green'
                }
              />
              {s.isOverEstimate && (
                <div className="small" style={{ color: 'var(--red)', marginTop: 7 }}>
                  ⚠ חריגה של {formatMinutes(s.spentMinutes - s.estimateMinutes)} מעבר להערכה
                </div>
              )}
            </div>
          </Card>
        )}

        {project.description && (
          <Card>
            <div className="card-pad muted" style={{ whiteSpace: 'pre-wrap' }}>
              {project.description}
            </div>
          </Card>
        )}

        <div className="tabs">
          <button
            className={`tab ${tab === 'tasks' ? 'active' : ''}`}
            onClick={() => setTab('tasks')}
          >
            משימות ({tasks.length})
          </button>
          <button
            className={`tab ${tab === 'time' ? 'active' : ''}`}
            onClick={() => setTab('time')}
          >
            רישומי זמן ({entries.length})
          </button>
        </div>

        {tab === 'tasks' && (
          <Card>
            <CardHead
              title="רשימת משימות"
              action={
                <div className="row">
                  <label className="checkbox-row small">
                    <input
                      type="checkbox"
                      checked={hideDone}
                      onChange={(e) => setHideDone(e.target.checked)}
                    />
                    הסתר שהושלמו
                  </label>
                  <button className="btn btn-sm" onClick={() => setTemplatePicker(true)}>
                    📋 תבנית
                  </button>
                  {tasks.length > 0 && (
                    <button className="btn btn-sm" onClick={() => setSaveAsTemplate(true)}>
                      💾 שמור כתבנית
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setNewTask(true)}
                  >
                    ➕ משימה
                  </button>
                </div>
              }
            />
            {visibleStages.length === 0 ? (
              <Empty icon="📋" title="אין עדיין משימות בפרויקט">
                <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                  <button className="btn" onClick={() => setTemplatePicker(true)}>
                    החלת תבנית מוכנה
                  </button>
                  <button className="btn btn-primary" onClick={() => setNewTask(true)}>
                    הוספת משימה
                  </button>
                </div>
              </Empty>
            ) : (
              visibleStages.map(({ stage, items }) => {
                const doneCount = items.filter((t) => t.status === 'done').length
                const stageMinutes = items.reduce(
                  (acc, t) => acc + sumMinutes(entriesForTask(data.timeEntries, t.id), now),
                  0,
                )
                return (
                  <div className="stage-group" key={stage}>
                    <div className="stage-head">
                      <span>{stage}</span>
                      <span className="faint">
                        {doneCount}/{items.length}
                      </span>
                      {stageMinutes > 0 && (
                        <span className="faint">· {formatMinutes(stageMinutes)}</span>
                      )}
                    </div>
                    {items.map((task, index) => {
                      const taskMinutes = sumMinutes(
                        entriesForTask(data.timeEntries, task.id),
                        now,
                      )
                      const isRunning = running?.taskId === task.id
                      const over =
                        task.estimateMinutes !== undefined &&
                        taskMinutes > task.estimateMinutes
                      return (
                        <div
                          className={`task-row ${task.status === 'done' ? 'done' : ''}`}
                          key={task.id}
                        >
                          <button
                            className={`task-check ${task.status === 'done' ? 'checked' : ''}`}
                            onClick={() => toggleTask(task.id)}
                            aria-label="סימון כהושלם"
                          >
                            ✓
                          </button>
                          <div className="task-main">
                            <div className="row" style={{ gap: 7, flexWrap: 'nowrap' }}>
                              <span className="task-title">{task.title}</span>
                              <PriorityBadge priority={task.priority} />
                            </div>
                            <div className="task-meta">
                              {taskMinutes > 0 && (
                                <span style={{ color: over ? 'var(--red)' : undefined }}>
                                  {formatMinutes(taskMinutes)}
                                  {task.estimateMinutes
                                    ? ` / ${formatMinutes(task.estimateMinutes)}`
                                    : ''}
                                </span>
                              )}
                              {taskMinutes === 0 && task.estimateMinutes && (
                                <span>הערכה {formatMinutes(task.estimateMinutes)}</span>
                              )}
                              {task.dueDate && <DueBadge date={task.dueDate} />}
                              {task.notes && <span title={task.notes}>📝</span>}
                            </div>
                          </div>
                          <div className="task-actions">
                            <button
                              className="icon-btn"
                              onClick={() => moveTask(task.id, -1)}
                              disabled={index === 0}
                              title="העלאה"
                            >
                              ↑
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => moveTask(task.id, 1)}
                              disabled={index === items.length - 1}
                              title="הורדה"
                            >
                              ↓
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => setEditTask(task)}
                              title="עריכה"
                            >
                              ✎
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => deleteTask(task.id)}
                              title="מחיקה"
                            >
                              🗑
                            </button>
                            {isRunning ? (
                              <button className="btn btn-sm btn-danger" onClick={stopTimer}>
                                ⏹
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm"
                                onClick={() => startTimer(project.id, task.id)}
                                title="הפעלת טיימר על המשימה"
                              >
                                ▶
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </Card>
        )}

        {tab === 'time' && (
          <Card>
            <CardHead
              title={`סה״כ ${formatMinutes(s.spentMinutes)} · לחיוב ${formatMinutes(
                s.billableMinutes,
              )}`}
              action={
                <button className="btn btn-sm" onClick={() => setManualTime(true)}>
                  ➕ רישום ידני
                </button>
              }
            />
            {entries.length === 0 ? (
              <Empty icon="⏱" title="אין עדיין רישומי זמן">
                הפעל טיימר על משימה או הוסף רישום ידני.
              </Empty>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>התחלה</th>
                      <th>משימה</th>
                      <th>תיאור</th>
                      <th className="num">משך</th>
                      <th>חיוב</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const task = data.tasks.find((t) => t.id === entry.taskId)
                      const mins = sumMinutes([entry], now)
                      return (
                        <tr key={entry.id}>
                          <td className="nowrap small">{formatDateTime(entry.start)}</td>
                          <td className="truncate">{task?.title ?? '—'}</td>
                          <td className="truncate faint">{entry.note ?? ''}</td>
                          <td className="num">
                            {entry.end === null ? (
                              <span style={{ color: 'var(--accent)' }}>רץ עכשיו…</span>
                            ) : (
                              formatMinutes(mins)
                            )}
                          </td>
                          <td>{entry.billable ? '✓' : '—'}</td>
                          <td>
                            <button
                              className="icon-btn"
                              onClick={() => deleteTimeEntry(entry.id)}
                              title="מחיקה"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
            מחיקת הפרויקט
          </button>
        </div>
      </div>

      {editProject && (
        <ProjectModal project={project} onClose={() => setEditProject(false)} />
      )}
      {newTask && (
        <TaskModal
          projectId={project.id}
          stages={stages.length ? stages : ['אפיון', 'עיצוב', 'פיתוח', 'מסירה']}
          onClose={() => setNewTask(false)}
        />
      )}
      {editTask && (
        <TaskModal
          task={editTask}
          projectId={project.id}
          stages={stages}
          onClose={() => setEditTask(undefined)}
        />
      )}
      {manualTime && (
        <TimeEntryModal defaultProjectId={project.id} onClose={() => setManualTime(false)} />
      )}
      {templatePicker && (
        <TemplatePickerModal
          onPick={(templateId) => {
            applyTemplate(project.id, templateId)
            setTemplatePicker(false)
          }}
          onClose={() => setTemplatePicker(false)}
        />
      )}
      {saveAsTemplate && (
        <SaveTemplateModal
          defaultName={project.name}
          onSave={(name) => {
            createTemplateFromProject(project.id, name)
            setSaveAsTemplate(false)
          }}
          onClose={() => setSaveAsTemplate(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="מחיקת פרויקט"
          message={`מחיקת "${project.name}" תמחק גם את כל המשימות ורישומי הזמן שלו. הפעולה אינה הפיכה.`}
          onConfirm={() => {
            deleteProject(project.id)
            navigate({ name: 'projects' })
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

function TemplatePickerModal({
  onPick,
  onClose,
}: {
  onPick: (templateId: string) => void
  onClose: () => void
}) {
  const { data } = useStore()
  return (
    <Modal title="החלת תבנית משימות" onClose={onClose} wide>
      <p className="muted small" style={{ marginBottom: 14 }}>
        המשימות של התבנית יתווספו לסוף רשימת המשימות של הפרויקט.
      </p>
      <div className="stack">
        {data.templates.map((t) => (
          <Card key={t.id} onClick={() => onPick(t.id)}>
            <div className="card-pad">
              <div className="row-between">
                <strong>{t.name}</strong>
                <span className="badge accent">{t.items.length} משימות</span>
              </div>
              {t.description && (
                <div className="small faint" style={{ marginTop: 4 }}>
                  {t.description}
                </div>
              )}
              <div className="small muted" style={{ marginTop: 8 }}>
                {[...new Set(t.items.map((i) => i.stage))].join(' · ')}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Modal>
  )
}

function SaveTemplateModal({
  defaultName,
  onSave,
  onClose,
}: {
  defaultName: string
  onSave: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(`תבנית — ${defaultName}`)
  return (
    <Modal
      title="שמירת המשימות כתבנית"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            ביטול
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(name.trim())}
            disabled={!name.trim()}
          >
            שמירה
          </button>
        </>
      }
    >
      <Field label="שם התבנית" hint="התבנית תהיה זמינה לכל פרויקט חדש">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>
    </Modal>
  )
}
