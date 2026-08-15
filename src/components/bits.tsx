import { Badge } from './ui'
import {
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  type Client,
  type ProjectStatus,
  type TaskPriority,
} from '../types'
import { daysUntil } from '../lib/utils'

const STATUS_TONE: Record<ProjectStatus, 'accent' | 'green' | 'amber' | 'purple' | undefined> = {
  lead: 'purple',
  active: 'accent',
  paused: undefined,
  review: 'amber',
  done: 'green',
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === 'normal') return null
  return (
    <Badge tone={priority === 'high' ? 'red' : undefined}>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  )
}

export function ClientDot({ client }: { client?: Client }) {
  return (
    <span
      className="dot"
      style={{ background: client?.color ?? 'var(--border-strong)' }}
      aria-hidden
    />
  )
}

/** תגית תאריך יעד עם צבע לפי כמה זמן נשאר */
export function DueBadge({ date }: { date?: string }) {
  const days = daysUntil(date)
  if (days === null) return null
  if (days < 0) return <Badge tone="red">באיחור {Math.abs(days)} ימים</Badge>
  if (days === 0) return <Badge tone="red">היעד היום</Badge>
  if (days === 1) return <Badge tone="amber">מחר</Badge>
  if (days <= 7) return <Badge tone="amber">בעוד {days} ימים</Badge>
  return <Badge>בעוד {days} ימים</Badge>
}
