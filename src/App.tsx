import { useCallback, useEffect, useMemo, useState } from 'react'
import { StoreProvider, useStore } from './store'
import { TimerBar } from './components/TimerBar'
import { Dashboard } from './pages/Dashboard'
import { ClientDetailPage, ClientsPage } from './pages/Clients'
import { ProjectsPage } from './pages/Projects'
import { ProjectDetailPage } from './pages/ProjectDetail'
import { TasksPage } from './pages/Tasks'
import { TimeLogPage } from './pages/TimeLog'
import { ReportsPage } from './pages/Reports'
import { TemplatesPage } from './pages/Templates'
import { SettingsPage } from './pages/Settings'
import { PwaPrompts, useIsStandalone } from './components/PwaPrompts'
import { ErrorBoundary } from './components/ErrorBoundary'
import { hashToRoute, routeToHash, type Route } from './routes'
import { openTasksSorted } from './lib/selectors'

/** מציג חיווי כשאין רשת — האפליקציה ממשיכה לעבוד, וכדאי שהמשתמש ידע שזה מכוון */
function useIsOffline(): boolean {
  const [offline, setOffline] = useState(() => !navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return offline
}

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: { name: 'dashboard' }, label: 'סקירה', icon: '🏠' },
  { route: { name: 'clients' }, label: 'לקוחות', icon: '👥' },
  { route: { name: 'projects' }, label: 'פרויקטים', icon: '📁' },
  { route: { name: 'tasks' }, label: 'משימות', icon: '✅' },
  { route: { name: 'time' }, label: 'יומן זמנים', icon: '⏱' },
  { route: { name: 'reports' }, label: 'דוחות', icon: '📊' },
  { route: { name: 'templates' }, label: 'תבניות', icon: '📋' },
  { route: { name: 'settings' }, label: 'הגדרות', icon: '⚙' },
]

function Shell() {
  const { data } = useStore()
  const [route, setRoute] = useState<Route>(() => hashToRoute(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(hashToRoute(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    window.location.hash = routeToHash(next)
    // גלילה לראש המסך במעבר בין עמודים
    window.scrollTo({ top: 0 })
  }, [])

  const openTaskCount = useMemo(() => openTasksSorted(data).length, [data])
  const offline = useIsOffline()
  const standalone = useIsStandalone()

  const page = (() => {
    switch (route.name) {
      case 'clients':
        return <ClientsPage navigate={navigate} />
      case 'client':
        return <ClientDetailPage clientId={route.id} navigate={navigate} />
      case 'projects':
        return <ProjectsPage navigate={navigate} />
      case 'project':
        return <ProjectDetailPage projectId={route.id} navigate={navigate} />
      case 'tasks':
        return <TasksPage navigate={navigate} />
      case 'time':
        return <TimeLogPage />
      case 'reports':
        return <ReportsPage />
      case 'templates':
        return <TemplatesPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <Dashboard navigate={navigate} />
    }
  })()

  const activeName =
    route.name === 'client' ? 'clients' : route.name === 'project' ? 'projects' : route.name

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-mark">ס</div>
          <div style={{ minWidth: 0 }}>
            <div className="brand-name">{data.settings.businessName}</div>
            <div className="brand-sub">ניהול משימות וזמנים</div>
          </div>
        </div>

        {NAV.map((item) => (
          <button
            key={item.route.name}
            className={`nav-item ${activeName === item.route.name ? 'active' : ''}`}
            onClick={() => navigate(item.route)}
          >
            <span className="nav-icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
            {item.route.name === 'tasks' && openTaskCount > 0 && (
              <span className="nav-badge">{openTaskCount}</span>
            )}
          </button>
        ))}

        <div className="sidebar-footer">
          {offline ? '⚡ מצב אופליין — הכל עובד כרגיל' : 'הנתונים נשמרים בדפדפן שלך בלבד'}
        </div>
      </nav>

      <main className={`main ${standalone ? 'standalone' : ''}`}>
        {offline && (
          <div className="offline-strip" role="status">
            ⚡ אין חיבור לאינטרנט — האפליקציה ממשיכה לעבוד והנתונים נשמרים במכשיר
          </div>
        )}
        <TimerBar onOpenProject={(id) => navigate({ name: 'project', id })} />
        {page}
      </main>

      <PwaPrompts />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </ErrorBoundary>
  )
}
