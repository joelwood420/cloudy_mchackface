import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="content">
        <Outlet />
      </div>
    </div>
  )
}
