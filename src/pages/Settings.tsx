import { useRef, useState } from 'react'
import { useStore } from '../store'
import { Card, CardHead, Field } from '../components/ui'
import { ConfirmModal } from '../components/modals'
import { exportData, parseImport } from '../lib/storage'
import { formatMinutes } from '../lib/utils'
import { sumMinutes } from '../lib/selectors'
import { demoData } from '../data/demo'

export function SettingsPage() {
  const { data, updateSettings, setData, resetData } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDemo, setConfirmDemo] = useState(false)
  const [message, setMessage] = useState('')

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      setData(parseImport(text))
      setMessage('✓ הנתונים יובאו בהצלחה')
    } catch {
      setMessage('✗ הקובץ לא תקין — ודא שזה קובץ גיבוי של המערכת')
    }
  }

  const totalMinutes = sumMinutes(data.timeEntries)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">הגדרות</h1>
          <div className="page-sub">הגדרות העסק וגיבוי הנתונים</div>
        </div>
      </div>

      <div className="stack" style={{ maxWidth: 720 }}>
        <Card>
          <CardHead title="פרטי העסק" />
          <div className="card-pad">
            <div className="form-grid">
              <Field label="שם העסק" className="full">
                <input
                  className="input"
                  value={data.settings.businessName}
                  onChange={(e) => updateSettings({ businessName: e.target.value })}
                />
              </Field>
              <Field
                label="תעריף שעתי ברירת מחדל"
                hint="משמש לחישוב רווחיות כשאין תעריף ללקוח"
              >
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={data.settings.defaultHourlyRate}
                  onChange={(e) =>
                    updateSettings({ defaultHourlyRate: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <Field label="סימן מטבע">
                <input
                  className="input"
                  value={data.settings.currency}
                  onChange={(e) => updateSettings({ currency: e.target.value })}
                />
              </Field>
              <Field label="שעות עבודה ביום" hint="לחישוב ימי עבודה בדוחות">
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="24"
                  value={data.settings.workdayHours}
                  onChange={(e) =>
                    updateSettings({ workdayHours: Number(e.target.value) || 8 })
                  }
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="הנתונים שלי" />
          <div className="card-pad">
            <div className="row" style={{ gap: 24, marginBottom: 16 }}>
              <div>
                <div className="faint small">לקוחות</div>
                <strong>{data.clients.length}</strong>
              </div>
              <div>
                <div className="faint small">פרויקטים</div>
                <strong>{data.projects.length}</strong>
              </div>
              <div>
                <div className="faint small">משימות</div>
                <strong>{data.tasks.length}</strong>
              </div>
              <div>
                <div className="faint small">רישומי זמן</div>
                <strong>{data.timeEntries.length}</strong>
              </div>
              <div>
                <div className="faint small">סה״כ זמן</div>
                <strong>{formatMinutes(totalMinutes)}</strong>
              </div>
            </div>

            <p className="small muted" style={{ marginBottom: 14 }}>
              הנתונים נשמרים מקומית בדפדפן הזה בלבד (localStorage) ולא נשלחים לשום שרת.
              מומלץ לייצא גיבוי מדי פעם — ניקוי היסטוריית הדפדפן ימחק את הנתונים.
            </p>

            <div className="row">
              <button className="btn" onClick={() => exportData(data)}>
                ⬇ ייצוא גיבוי
              </button>
              <button className="btn" onClick={() => fileRef.current?.click()}>
                ⬆ ייבוא גיבוי
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImport(file)
                  e.target.value = ''
                }}
              />
              <button className="btn" onClick={() => setConfirmDemo(true)}>
                🎬 טעינת נתוני הדגמה
              </button>
              <div className="spacer" />
              <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>
                איפוס הכל
              </button>
            </div>

            {message && (
              <div className="small" style={{ marginTop: 12 }}>
                {message}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="איך עובדים עם המערכת" />
          <div className="card-pad small muted stack" style={{ gap: 8 }}>
            <div>
              <strong>1. לקוח</strong> — מוסיפים לקוח עם פרטי קשר ותעריף שעתי מוסכם.
            </div>
            <div>
              <strong>2. פרויקט</strong> — פותחים פרויקט ללקוח, מזינים מחיר ותאריך יעד,
              ובוחרים תבנית משימות מוכנה. כל המשימות נוצרות אוטומטית.
            </div>
            <div>
              <strong>3. טיימר</strong> — לוחצים ▶ ליד משימה כדי להתחיל למדוד. הטיימר רץ
              בראש המסך עד שעוצרים אותו. אפשר גם להזין זמן ידנית בדיעבד.
            </div>
            <div>
              <strong>4. דוחות</strong> — רואים כמה זמן באמת לקח כל פרויקט, מול ההערכה,
              וכמה יצא ₪ לשעה בפועל. משם יודעים לתמחר את הפרויקט הבא נכון.
            </div>
          </div>
        </Card>
      </div>

      {confirmReset && (
        <ConfirmModal
          title="איפוס כל הנתונים"
          message="כל הלקוחות, הפרויקטים, המשימות ורישומי הזמן יימחקו לצמיתות. מומלץ לייצא גיבוי קודם."
          confirmLabel="מחק הכל"
          onConfirm={() => {
            resetData()
            setMessage('הנתונים אופסו')
          }}
          onClose={() => setConfirmReset(false)}
        />
      )}
      {confirmDemo && (
        <ConfirmModal
          title="טעינת נתוני הדגמה"
          message="הפעולה תחליף את כל הנתונים הקיימים בנתוני דוגמה, כדי להתרשם מהמערכת. מומלץ לייצא גיבוי קודם."
          confirmLabel="טען הדגמה"
          onConfirm={() => {
            setData(demoData())
            setMessage('✓ נתוני ההדגמה נטענו')
          }}
          onClose={() => setConfirmDemo(false)}
        />
      )}
    </>
  )
}
