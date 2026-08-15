import { useState } from 'react'
import { Field, Modal } from './ui'
import { useStore } from '../store'
import {
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type Client,
  type Project,
  type ProjectStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TimeEntry,
} from '../types'
import { parseDuration, parseNumber, toDateInput, toDateTimeInput } from '../lib/utils'

/** ===== לקוח ===== */

export function ClientModal({
  client,
  onClose,
}: {
  client?: Client
  onClose: () => void
}) {
  const { addClient, updateClient } = useStore()
  const [name, setName] = useState(client?.name ?? '')
  const [company, setCompany] = useState(client?.company ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [rate, setRate] = useState(client?.hourlyRate?.toString() ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')

  const save = () => {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      hourlyRate: parseNumber(rate),
      notes: notes.trim() || undefined,
    }
    if (client) updateClient(client.id, payload)
    else addClient(payload)
    onClose()
  }

  return (
    <Modal
      title={client ? 'עריכת לקוח' : 'לקוח חדש'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            ביטול
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!name.trim()}>
            שמירה
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="שם איש קשר *" className="full">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: דנה כהן"
            autoFocus
          />
        </Field>
        <Field label="שם העסק">
          <input
            className="input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </Field>
        <Field label="טלפון">
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="אימייל">
          <input
            className="input"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="תעריף שעתי (₪)" hint="ריק = לפי ברירת המחדל בהגדרות">
          <input
            className="input"
            type="number"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </Field>
        <Field label="הערות" className="full">
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}

/** ===== פרויקט ===== */

export function ProjectModal({
  project,
  defaultClientId,
  onClose,
  onCreated,
}: {
  project?: Project
  defaultClientId?: string
  onClose: () => void
  onCreated?: (id: string) => void
}) {
  const { data, addProject, updateProject, applyTemplate } = useStore()
  const [clientId, setClientId] = useState(
    project?.clientId ?? defaultClientId ?? data.clients[0]?.id ?? '',
  )
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active')
  const [price, setPrice] = useState(project?.price?.toString() ?? '')
  const [estimateHours, setEstimateHours] = useState(project?.estimateHours?.toString() ?? '')
  const [startDate, setStartDate] = useState(toDateInput(project?.startDate))
  const [dueDate, setDueDate] = useState(toDateInput(project?.dueDate))
  const [templateId, setTemplateId] = useState('')

  const canSave = name.trim() !== '' && clientId !== ''

  const save = () => {
    if (!canSave) return
    const payload = {
      clientId,
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      price: parseNumber(price),
      estimateHours: parseNumber(estimateHours),
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    }
    if (project) {
      updateProject(project.id, payload)
    } else {
      const created = addProject(payload)
      if (templateId) applyTemplate(created.id, templateId)
      onCreated?.(created.id)
    }
    onClose()
  }

  if (data.clients.length === 0) {
    return (
      <Modal
        title="פרויקט חדש"
        onClose={onClose}
        footer={
          <button className="btn btn-primary" onClick={onClose}>
            הבנתי
          </button>
        }
      >
        <p className="muted">צריך להוסיף לקוח לפני שאפשר לפתוח פרויקט.</p>
      </Modal>
    )
  }

  return (
    <Modal
      title={project ? 'עריכת פרויקט' : 'פרויקט חדש'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            ביטול
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!canSave}>
            שמירה
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="לקוח *">
          <select
            className="select"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` · ${c.company}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="שם הפרויקט *">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: אתר תדמית"
            autoFocus
          />
        </Field>
        <Field label="סטטוס">
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="מחיר מוסכם (₪)">
          <input
            className="input"
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="הערכת שעות" hint="ריק = סכום הערכות המשימות">
          <input
            className="input"
            type="number"
            min="0"
            step="0.5"
            value={estimateHours}
            onChange={(e) => setEstimateHours(e.target.value)}
          />
        </Field>
        <Field label="תאריך התחלה">
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="תאריך יעד">
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
        {!project && (
          <Field
            label="תבנית משימות"
            className="full"
            hint="כל משימות התבנית ייווצרו אוטומטית בפרויקט"
          >
            <select
              className="select"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">ללא תבנית — אתחיל מאפס</option>
              {data.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.items.length} משימות)
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="תיאור" className="full">
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}

/** ===== משימה ===== */

export function TaskModal({
  task,
  projectId,
  stages,
  onClose,
}: {
  task?: Task
  projectId: string
  stages: string[]
  onClose: () => void
}) {
  const { addTask, updateTask } = useStore()
  const [title, setTitle] = useState(task?.title ?? '')
  const [stage, setStage] = useState(task?.stage ?? stages[0] ?? 'כללי')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal')
  const [estimate, setEstimate] = useState(
    task?.estimateMinutes ? String(task.estimateMinutes) : '',
  )
  const [dueDate, setDueDate] = useState(toDateInput(task?.dueDate))
  const [notes, setNotes] = useState(task?.notes ?? '')

  const save = () => {
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      stage: stage.trim() || 'כללי',
      status,
      priority,
      estimateMinutes: parseDuration(estimate),
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      notes: notes.trim() || undefined,
    }
    if (task) updateTask(task.id, payload)
    else addTask({ projectId, ...payload })
    onClose()
  }

  return (
    <Modal
      title={task ? 'עריכת משימה' : 'משימה חדשה'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            ביטול
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!title.trim()}>
            שמירה
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="כותרת *" className="full">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="שלב" hint="למשל: אפיון, עיצוב, פיתוח">
          <input
            className="input"
            list="stage-options"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          />
          <datalist id="stage-options">
            {stages.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="הערכת זמן (דקות)" hint="אפשר גם 1:30">
          <input
            className="input"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder="90"
          />
        </Field>
        <Field label="סטטוס">
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="עדיפות">
          <select
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="תאריך יעד" className="full">
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
        <Field label="הערות" className="full">
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}

/** ===== רישום זמן ידני ===== */

export function TimeEntryModal({
  entry,
  defaultProjectId,
  onClose,
}: {
  entry?: TimeEntry
  defaultProjectId?: string
  onClose: () => void
}) {
  const { data, addTimeEntry, updateTimeEntry } = useStore()
  const [projectId, setProjectId] = useState(
    entry?.projectId ?? defaultProjectId ?? data.projects[0]?.id ?? '',
  )
  const [taskId, setTaskId] = useState(entry?.taskId ?? '')
  const [start, setStart] = useState(
    toDateTimeInput(entry?.start ?? new Date().toISOString()),
  )
  const [duration, setDuration] = useState(() => {
    if (!entry?.end) return '60'
    const mins =
      (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 60000
    return String(Math.round(mins))
  })
  const [note, setNote] = useState(entry?.note ?? '')
  const [billable, setBillable] = useState(entry?.billable ?? true)

  const projectTasks = data.tasks.filter((t) => t.projectId === projectId)
  const minutes = parseDuration(duration)
  const canSave = projectId !== '' && start !== '' && minutes !== undefined && minutes > 0

  const save = () => {
    if (!canSave || minutes === undefined) return
    const startIso = new Date(start).toISOString()
    const endIso = new Date(new Date(start).getTime() + minutes * 60000).toISOString()
    const payload = {
      projectId,
      taskId: taskId || null,
      start: startIso,
      end: endIso,
      note: note.trim() || undefined,
      billable,
    }
    if (entry) updateTimeEntry(entry.id, payload)
    else addTimeEntry(payload)
    onClose()
  }

  if (data.projects.length === 0) {
    return (
      <Modal
        title="רישום זמן"
        onClose={onClose}
        footer={
          <button className="btn btn-primary" onClick={onClose}>
            הבנתי
          </button>
        }
      >
        <p className="muted">צריך פרויקט אחד לפחות כדי לרשום זמן.</p>
      </Modal>
    )
  }

  return (
    <Modal
      title={entry ? 'עריכת רישום זמן' : 'רישום זמן ידני'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            ביטול
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!canSave}>
            שמירה
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="פרויקט *" className="full">
          <select
            className="select"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value)
              setTaskId('')
            }}
          >
            {data.projects.map((p) => {
              const client = data.clients.find((c) => c.id === p.clientId)
              return (
                <option key={p.id} value={p.id}>
                  {client?.name ? `${client.name} · ` : ''}
                  {p.name}
                </option>
              )
            })}
          </select>
        </Field>
        <Field label="משימה" className="full">
          <select
            className="select"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">ללא משימה מסוימת</option>
            {projectTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="התחלה *">
          <input
            className="input"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="משך (דקות) *" hint="אפשר גם 1:30">
          <input
            className="input"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </Field>
        <Field label="תיאור" className="full">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <label className="checkbox-row full">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
          />
          זמן לחיוב
        </label>
      </div>
    </Modal>
  )
}

/** ===== אישור מחיקה ===== */

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'מחיקה',
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            ביטול
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  )
}
