import { Outlet } from '@tanstack/react-router'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar />
      <main
        id="main-content"
        className="ml-60 pt-14 min-h-screen"
        tabIndex={-1}
        aria-label="Contenu principal"
      >
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
