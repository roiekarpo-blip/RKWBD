import { useStore, useRunningTimer, useTicker } from '../store'
import { formatClock } from '../lib/utils'

/** פס הטיימר הרץ — מוצג בראש כל מסך כשיש טיימר פעיל */
export function TimerBar({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { data, stopTimer } = useStore()
  const entry = useRunningTimer()
  const tick = useTicker(Boolean(entry))

  if (!entry) return null

  const project = data.projects.find((p) => p.id === entry.projectId)
  const task = entry.taskId ? data.tasks.find((t) => t.id === entry.taskId) : undefined
  const seconds = (tick - new Date(entry.start).getTime()) / 1000

  return (
    <div className="timer-bar">
      <span className="pulse" aria-hidden />
      <div className="timer-clock">{formatClock(seconds)}</div>
      <div className="timer-info truncate">
        <strong className="truncate">{task?.title ?? project?.name ?? 'עבודה כללית'}</strong>
        {task && project ? project.name : 'טיימר פעיל'}
      </div>
      <div className="spacer" />
      {project && (
        <button className="btn btn-sm" onClick={() => onOpenProject(project.id)}>
          לפרויקט
        </button>
      )}
      <button className="btn btn-sm" onClick={stopTimer}>
        ⏹ עצור
      </button>
    </div>
  )
}
