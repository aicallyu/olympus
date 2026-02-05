import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

const navItems = [
  { path: '/', label: 'OVERVIEW' },
  { path: '/tasks', label: 'TASK BOARD' },
  { path: '/agents', label: 'AGENTS' },
  { path: '/activity', label: 'ACTIVITY' },
]

export function Header() {
  const [clock, setClock] = useState('00:00:00')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const time = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      setClock(time)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="border-b border-border bg-[rgba(10,10,14,0.8)] backdrop-blur">
      <div className="px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-primary text-2xl">🔱</span>
            <div>
              <p className="font-display uppercase tracking-[0.2em] text-primary text-sm">OLYMPUS</p>
              <p className="text-xs text-text-muted font-mono uppercase tracking-[0.24em]">
                Command of the Gods
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-6">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                SYSTEM ONLINE
              </div>
              <div className="font-mono text-sm text-text-secondary tracking-[0.2em]">
                {clock}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="sm:hidden h-11 w-11 inline-flex items-center justify-center rounded-lg border border-border text-text-primary"
              aria-label="Toggle navigation"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary sm:hidden">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            SYSTEM ONLINE
          </div>
          <div className="text-text-muted">{clock}</div>
        </div>
      </div>

      <div className="px-4 pb-4 sm:px-8 sm:pb-3">
        <nav className="hidden sm:flex items-center gap-8 text-xs font-mono uppercase tracking-[0.24em] text-text-muted">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `pb-2 border-b-2 transition-colors ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'border-transparent hover:text-text-primary'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <nav
          className={`sm:hidden ${
            isMenuOpen ? 'flex' : 'hidden'
          } flex-col gap-2 border-t border-border/50 pt-3 text-xs font-mono uppercase tracking-[0.24em] text-text-muted`}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `min-h-[44px] rounded-md px-4 py-3 transition-colors ${
                  isActive
                    ? 'text-primary bg-[rgba(184,150,90,0.12)]'
                    : 'text-text-muted hover:text-text-primary'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
