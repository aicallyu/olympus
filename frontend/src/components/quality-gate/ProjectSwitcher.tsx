import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Layers } from 'lucide-react'
import { useOlympusStore } from '@/hooks/useOlympusStore'

export function ProjectSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const projects = useOlympusStore((state) => state.projects)
  const selectedProjectId = useOlympusStore((state) => state.selectedProjectId)
  const setSelectedProject = useOlympusStore((state) => state.setSelectedProject)
  const fetchProjects = useOlympusStore((state) => state.fetchProjects)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const displayName = selectedProject?.name || selectedProjectId.toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-[rgba(22,22,32,0.6)] px-3 py-1.5 hover:border-primary/40 transition-colors"
      >
        <Layers size={12} className="text-primary" />
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-text-primary">
          {displayName}
        </span>
        <ChevronDown size={12} className="text-text-muted" />
      </button>

      {isOpen && projects.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-30 min-w-[200px] bg-[rgba(15,15,18,0.98)] border border-border rounded-lg shadow-xl py-1">
          {/* All projects option */}
          <button
            onClick={() => {
              setSelectedProject('all')
              setIsOpen(false)
            }}
            className={`w-full px-4 py-2.5 text-left hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center gap-3 ${
              selectedProjectId === 'all' ? 'text-primary bg-[rgba(184,150,90,0.08)]' : 'text-text-secondary'
            }`}
          >
            <Layers size={14} className={selectedProjectId === 'all' ? 'text-primary' : 'text-text-muted'} />
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.1em]">All Projects</span>
              <p className="text-[10px] text-text-muted">Unified feed</p>
            </div>
          </button>

          <div className="border-t border-border/30 my-1" />

          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                setSelectedProject(project.id)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-2.5 text-left hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center gap-3 ${
                selectedProjectId === project.id
                  ? 'text-primary bg-[rgba(184,150,90,0.08)]'
                  : 'text-text-secondary'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                project.is_active ? 'bg-success' : 'bg-border'
              }`} />
              <div>
                <span className="text-xs font-mono uppercase tracking-[0.1em]">{project.name}</span>
                <p className="text-[10px] text-text-muted">{project.config.deployment.live_url}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
