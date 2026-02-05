import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Kanban, 
  Bot, 
  Activity,
  Settings 
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/tasks', icon: Kanban, label: 'Task Board' },
  { path: '/agents', icon: Bot, label: 'Agents' },
  { path: '/activity', icon: Activity, label: 'Activity' },
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-primary">🔱</span>
          Mission Control
        </h1>
        <p className="text-xs text-text-muted mt-1">ARGOS Squad</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`
            }
          >
            <Icon size={18} />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-border">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors">
          <Settings size={18} />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  )
}
