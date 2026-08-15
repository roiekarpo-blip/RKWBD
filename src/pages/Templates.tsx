import { useState } from 'react'
import { useStore } from '../store'
import { Card, CardHead, Empty, Field, Modal } from '../components/ui'
import { ConfirmModal } from '../components/modals'
import { formatMinutes, uid } from '../lib/utils'
import type { Template, TemplateItem } from '../types'

/** ניהול תבניות — רשימות המשימות הקבועות שחוזרות בכל לקוח */
export function TemplatesPage() {
  const { data, deleteTemplate } = useStore()
  const [editing, setEditing] = useState<Template | undefined>()
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Template | undefined>()

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">תבניות משימות</h1>
          <div className="page-sub">
            מה צריך לעשות בכל פרויקט — פעם אחת מגדירים, בכל לקוח חדש מחילים
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          ➕ תבנית חדשה
        </button>
      </div>

      <div className="grid grid-cards">
        {data.templates.map((template) => {
          const stages = [...new Set(template.items.map((i) => i.stage))]
          const totalMinutes = template.items.reduce(
            (a, i) => a + (i.estimateMinutes ?? 0),
            0,
          )
          return (
            <Card key={template.id}>
              <div className="card-pad">
                <div className="row-between">
                  <strong className="truncate">{template.name}</strong>
                  {template.builtin && <span className="badge">מובנית</span>}
                </div>
                {template.description && (
                  <div className="small faint" style={{ marginTop: 4 }}>
                    {template.description}
                  </div>
                )}
                <div className="row" style={{ marginTop: 12, gap: 16, fontSize: 13 }}>
                  <div>
                    <div className="faint small">משימות</div>
                    <strong>{template.items.length}</strong>
                  </div>
                  <div>
                    <div className="faint small">שלבים</div>
                    <strong>{stages.length}</strong>
                  </div>
                  <div>
                    <div className="faint small">הערכה</div>
                    <strong>{formatMinutes(totalMinutes)}</strong>
                  </div>
                </div>
                <div className="small muted truncate" style={{ marginTop: 10 }}>
                  {stages.join(' · ')}
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => setEditing(template)}
                  >
                    {template.builtin ? '👁 צפייה' : '✎ עריכה'}
                  </button>
                  {!template.builtin && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setConfirmDelete(template)}
                    >
                      מחיקה
                    </button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {(editing || creating) && (
        <TemplateEditor
          template={editing}
          onClose={() => {
            setEditing(undefined)
            setCreating(false)
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="מחיקת תבנית"
          message={`התבנית "${confirmDelete.name}" תימחק. פרויקטים שכבר השתמשו בה לא יושפעו.`}
          onConfirm={() => deleteTemplate(confirmDelete.id)}
          onClose={() => setConfirmDelete(undefined)}
        />
      )}
    </>
  )
}

function TemplateEditor({
  template,
  onClose,
}: {
  template?: Template
  onClose: () => void
}) {
  const { saveTemplate } = useStore()
  const readOnly = Boolean(template?.builtin)
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [items, setItems] = useState<TemplateItem[]>(
    template?.items.map((i) => ({ ...i })) ?? [
      { title: '', stage: 'אפיון', estimateMinutes: 60 },
    ],
  )

  const setItem = (index: number, patch: Partial<TemplateItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const save = () => {
    const cleaned = items.filter((i) => i.title.trim() !== '')
    if (!name.trim() || cleaned.length === 0) return
    saveTemplate({
      id: template?.id ?? uid('tpl_'),
      name: name.trim(),
      description: description.trim() || undefined,
      items: cleaned.map((i) => ({
        title: i.title.trim(),
        stage: i.stage.trim() || 'כללי',
        estimateMinutes: i.estimateMinutes,
        priority: i.priority,
      })),
    })
    onClose()
  }

  /** משכפל תבנית מובנית לעותק שניתן לערוך */
  const duplicate = () => {
    saveTemplate({
      id: uid('tpl_'),
      name: `${name} (עותק)`,
      description,
      items: items.map((i) => ({ ...i })),
    })
    onClose()
  }

  return (
    <Modal
      title={template ? template.name : 'תבנית חדשה'}
      onClose={onClose}
      wide
      footer={
        readOnly ? (
          <>
            <button className="btn" onClick={onClose}>
              סגירה
            </button>
            <button className="btn btn-primary" onClick={duplicate}>
              שכפול לעריכה
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={onClose}>
              ביטול
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={!name.trim() || items.every((i) => !i.title.trim())}
            >
              שמירה
            </button>
          </>
        )
      }
    >
      {readOnly ? (
        <>
          <p className="muted small" style={{ marginBottom: 14 }}>
            זו תבנית מובנית. אפשר לשכפל אותה ולערוך את העותק.
          </p>
          {[...new Set(items.map((i) => i.stage))].map((stage) => (
            <div key={stage} style={{ marginBottom: 14 }}>
              <div className="label" style={{ marginBottom: 6 }}>
                {stage}
              </div>
              {items
                .filter((i) => i.stage === stage)
                .map((item, i) => (
                  <div className="row-between small" key={i} style={{ padding: '4px 0' }}>
                    <span>• {item.title}</span>
                    <span className="faint nowrap">
                      {item.estimateMinutes ? formatMinutes(item.estimateMinutes) : ''}
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </>
      ) : (
        <div className="stack">
          <div className="form-grid">
            <Field label="שם התבנית *">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="תיאור">
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>

          <CardHead
            title={`משימות (${items.filter((i) => i.title.trim()).length})`}
            action={
              <button
                className="btn btn-sm"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    {
                      title: '',
                      stage: prev[prev.length - 1]?.stage ?? 'כללי',
                      estimateMinutes: 60,
                    },
                  ])
                }
              >
                ➕ שורה
              </button>
            }
          />

          {items.map((item, index) => (
            <div
              className="row"
              key={index}
              style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}
            >
              <input
                className="input"
                style={{ flex: 3 }}
                placeholder="שם המשימה"
                value={item.title}
                onChange={(e) => setItem(index, { title: e.target.value })}
              />
              <input
                className="input"
                style={{ flex: 1.4 }}
                placeholder="שלב"
                value={item.stage}
                onChange={(e) => setItem(index, { stage: e.target.value })}
              />
              <input
                className="input"
                style={{ width: 88 }}
                type="number"
                min="0"
                placeholder="דק'"
                value={item.estimateMinutes ?? ''}
                onChange={(e) =>
                  setItem(index, {
                    estimateMinutes: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <button
                className="icon-btn"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                title="הסרה"
              >
                🗑
              </button>
            </div>
          ))}

          {items.length === 0 && <Empty icon="📋" title="אין עדיין שורות" />}
        </div>
      )}
    </Modal>
  )
}
