export type Route =
  | { name: 'dashboard' }
  | { name: 'clients' }
  | { name: 'client'; id: string }
  | { name: 'projects' }
  | { name: 'project'; id: string }
  | { name: 'tasks' }
  | { name: 'time' }
  | { name: 'reports' }
  | { name: 'templates' }
  | { name: 'settings' }

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'client':
      return `#/clients/${route.id}`
    case 'project':
      return `#/projects/${route.id}`
    default:
      return `#/${route.name}`
  }
}

export function hashToRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [head, id] = path.split('/')

  switch (head) {
    case 'clients':
      return id ? { name: 'client', id } : { name: 'clients' }
    case 'projects':
      return id ? { name: 'project', id } : { name: 'projects' }
    case 'tasks':
      return { name: 'tasks' }
    case 'time':
      return { name: 'time' }
    case 'reports':
      return { name: 'reports' }
    case 'templates':
      return { name: 'templates' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'dashboard' }
  }
}
