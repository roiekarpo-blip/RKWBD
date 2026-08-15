import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** אירוע ההתקנה של כרום/אדג' — עדיין לא בטיפוסים הסטנדרטיים */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const INSTALL_DISMISSED_KEY = 'rkwbd.install-dismissed'

/**
 * שני באנרים קטנים בתחתית המסך:
 * 1. הצעה להתקין את האפליקציה על המכשיר
 * 2. הודעה כשיש גרסה חדשה שממתינה לרענון
 */
export function PwaPrompts() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('רישום ה-service worker נכשל', error)
    },
  })

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      if (localStorage.getItem(INSTALL_DISMISSED_KEY) === '1') return
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'dismissed') localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
    setInstallEvent(null)
  }

  const dismissInstall = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
    setInstallEvent(null)
  }

  if (needRefresh) {
    return (
      <div className="toast" role="status">
        <span className="toast-icon" aria-hidden>
          ✨
        </span>
        <div className="toast-body">
          <strong>גרסה חדשה זמינה</strong>
          <span className="small">רענון יטען את הגרסה המעודכנת. הנתונים שלך נשמרים.</span>
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => updateServiceWorker(true)}>
          רענון
        </button>
        <button
          className="icon-btn"
          onClick={() => setNeedRefresh(false)}
          aria-label="סגירה"
        >
          ✕
        </button>
      </div>
    )
  }

  if (installEvent && !installed) {
    return (
      <div className="toast" role="status">
        <span className="toast-icon" aria-hidden>
          📲
        </span>
        <div className="toast-body">
          <strong>להתקין את האפליקציה?</strong>
          <span className="small">
            אייקון על מסך הבית, פתיחה במסך מלא ועבודה גם בלי אינטרנט.
          </span>
        </div>
        <button className="btn btn-sm btn-primary" onClick={install}>
          התקנה
        </button>
        <button className="icon-btn" onClick={dismissInstall} aria-label="לא עכשיו">
          ✕
        </button>
      </div>
    )
  }

  return null
}

/** מציין אם האפליקציה רצה כאפליקציה מותקנת ולא בתוך דפדפן */
export function useIsStandalone(): boolean {
  const [standalone, setStandalone] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(display-mode: standalone)')
    const update = () =>
      setStandalone(
        query.matches ||
          // iOS מדווח על זה בדרך אחרת
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
      )
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return standalone
}
