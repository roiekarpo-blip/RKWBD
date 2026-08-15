import { useEffect, type ReactNode } from 'react'
import { classNames } from '../lib/utils'

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={classNames('card', onClick && 'clickable', className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHead({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="card-head">
      <div className="card-title">{title}</div>
      {action}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  tone?: 'accent' | 'green' | 'red' | 'amber' | 'purple'
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={classNames('stat-value', tone)}>{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export function Badge({
  children,
  tone,
}: {
  children: ReactNode
  tone?: 'accent' | 'green' | 'red' | 'amber' | 'purple'
}) {
  return <span className={classNames('badge', tone)}>{children}</span>
}

export function Progress({ value, tone }: { value: number; tone?: 'green' | 'amber' | 'red' }) {
  return (
    <div className="progress">
      <div
        className={classNames('progress-fill', tone)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function Empty({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {children && <div className="small">{children}</div>}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={classNames('modal', wide && 'modal-wide')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={classNames('field', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}

/** גרף עמודות אנכי — שעות לפי יום/חודש */
export function Bars({
  data,
}: {
  data: { key: string; label: string; minutes: number; title?: string }[]
}) {
  const max = Math.max(1, ...data.map((d) => d.minutes))
  return (
    <div className="bars">
      {data.map((item) => (
        <div className="bar-col" key={item.key} title={item.title}>
          <div className="bar-slot">
            <div className="bar" style={{ height: `${(item.minutes / max) * 100}%` }} />
          </div>
          <div className="bar-label">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

/** גרף עמודות אופקי פשוט לדוחות */
export function HBar({
  name,
  value,
  max,
  label,
  color,
}: {
  name: string
  value: number
  max: number
  label: string
  color?: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="hbar-row">
      <div className="hbar-name" title={name}>
        {name}
      </div>
      <div className="hbar-track">
        <div
          className="hbar-fill"
          style={{ width: `${pct}%`, background: color ?? 'var(--accent)' }}
        />
      </div>
      <div className="hbar-value">{label}</div>
    </div>
  )
}
