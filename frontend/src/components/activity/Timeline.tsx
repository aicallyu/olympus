import { useMemo, useState } from 'react'
import { useOlympusStore, ActivityType } from '@/hooks/useOlympusStore'

const filters: { id: 'all' | ActivityType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'system', label: 'System' },
  { id: 'task', label: 'Tasks' },
  { id: 'review', label: 'Review' },
  { id: 'heartbeat', label: 'Heartbeat' },
  { id: 'alert', label: 'Alerts' },
]

const typeStyles: Record<ActivityType, string> = {
  system: 'bg-primary',
  task: 'bg-success',
  review: 'bg-info',
  heartbeat: 'bg-text-muted',
  alert: 'bg-error',
}

export function Timeline() {
  const activities = useOlympusStore((state) => state.activities)
  const [activeFilter, setActiveFilter] = useState<'all' | ActivityType>('all')

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return activities
    return activities.filter((activity) => activity.type === activeFilter)
  }, [activities, activeFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-text-muted">Activity</p>
          <h2 className="text-2xl font-display mt-2 sm:text-3xl">Operational Timeline</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`min-h-[44px] rounded-full px-4 text-[10px] font-mono uppercase tracking-[0.2em] border transition-colors ${
                activeFilter === filter.id
                  ? 'border-primary text-primary bg-[rgba(184,150,90,0.12)]'
                  : 'border-border text-text-muted hover:text-text-primary'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="space-y-6">
          {filtered.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${typeStyles[activity.type]} ${activity.type === 'alert' ? 'animate-alert-blink' : ''}`}
                />
                {index !== filtered.length - 1 && (
                  <span className="flex-1 w-px bg-[rgba(255,255,255,0.08)] mt-2" />
                )}
              </div>

              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted">
                  <span>{activity.time}</span>
                  <span>•</span>
                  <span className="text-primary">{activity.agent}</span>
                </div>
                <div className="mt-2 text-sm text-text-primary">{activity.title}</div>
                <div className="mt-1 text-xs text-text-secondary">{activity.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
