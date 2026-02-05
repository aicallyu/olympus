import { useOlympusStore } from '@/hooks/useOlympusStore'

const typeStyles: Record<string, string> = {
  system: 'bg-primary',
  task: 'bg-success',
  alert: 'bg-error',
  heartbeat: 'bg-text-muted',
  review: 'bg-info',
}

export function ActivityFeed() {
  const activities = useOlympusStore((state) => state.activities)

  return (
    <div className="glass-panel p-5 glow-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono uppercase tracking-[0.24em] text-text-secondary">
          Activity Relay
        </h3>
        <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-text-muted">
          Live
        </span>
      </div>
      <div className="space-y-5">
        {activities.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={`h-2.5 w-2.5 rounded-full mt-2 ${typeStyles[activity.type]} ${activity.type === 'alert' ? 'animate-alert-blink' : ''}`} />
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-text-muted">
                <span>{activity.time}</span>
                <span>•</span>
                <span className="text-primary">{activity.agent}</span>
              </div>
              <p className="mt-2 text-sm text-text-primary">{activity.title}</p>
              <p className="mt-1 text-xs text-text-secondary">{activity.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
