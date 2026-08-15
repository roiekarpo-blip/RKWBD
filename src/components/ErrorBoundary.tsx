import { Component, type ErrorInfo, type ReactNode } from 'react'
import { exportData, loadData } from '../lib/storage'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * תופס קריסות של הממשק כדי שלא יישאר מסך לבן.
 * חשוב במיוחד כאן: הנתונים יושבים בדפדפן, ולכן מציעים ייצוא גיבוי לפני כל פעולה אחרת.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('קריסה בממשק', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="crash">
        <div className="crash-card card">
          <div className="card-pad">
            <div style={{ fontSize: 32, marginBottom: 10 }}>😕</div>
            <h2 style={{ marginBottom: 8 }}>משהו השתבש</h2>
            <p className="muted" style={{ marginBottom: 16 }}>
              אירעה שגיאה בממשק. הנתונים שלך עדיין שמורים בדפדפן — מומלץ לייצא גיבוי לפני
              שממשיכים.
            </p>
            <pre className="crash-details">{error.message}</pre>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                רענון הדף
              </button>
              <button
                className="btn"
                onClick={() => {
                  try {
                    exportData(loadData())
                  } catch {
                    alert('ייצוא הגיבוי נכשל')
                  }
                }}
              >
                ⬇ ייצוא גיבוי
              </button>
              <button
                className="btn"
                onClick={() => {
                  window.location.hash = '#/dashboard'
                  this.setState({ error: null })
                }}
              >
                חזרה לסקירה
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
