import { Activity, PauseCircle, AlertTriangle } from 'lucide-react'
import { OlympusAgent } from '@/hooks/useOlympusStore'
import { PerformanceChart } from './PerformanceChart'

const statusConfig = {
  active: { label: 'Active', icon: Activity, className: 'text-success', pulse: 'animate-status-pulse' },
  idle: { label: 'Idle', icon: PauseCircle, className: 'text-text-muted', pulse: '' },
  blocked: { label: 'Blocked', icon: AlertTriangle, className: 'text-error', pulse: 'animate-alert-blink' },
}

interface AgentDetailCardProps {
  agent: OlympusAgent
}

export function AgentDetailCard({ agent }: AgentDetailCardProps) {
  const config = statusConfig[agent.status]
  const StatusIcon = config.icon

  return (
    <div className={`glass-panel glow-border-strong p-5 animate-card-reveal ${agent.status === 'active' ? 'animate-gold-breathe' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-text-muted">
            {agent.role}
          </p>
          <h3 className="mt-2 text-xl font-display text-text-primary">{agent.name}</h3>
          <p className="text-xs text-text-secondary font-mono uppercase tracking-[0.2em]">
            {agent.specialization}
          </p>
        </div>
        <div className={`h-10 w-10 rounded-full border border-border bg-[rgba(255,255,255,0.03)] flex items-center justify-center ${config.pulse}`}>
          <StatusIcon size={18} className={config.className} />
        </div>
      </div>

      <div className="mt-4">
        <PerformanceChart trend={agent.trend} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted sm:grid-cols-3">
        <div>
          <p className="text-text-secondary">Model</p>
          <p className="text-text-primary">{agent.model}</p>
        </div>
        <div>
          <p className="text-text-secondary">Reliability</p>
          <p className="text-text-primary">{agent.reliability}%</p>
        </div>
        <div>
          <p className="text-text-secondary">Efficiency</p>
          <p className="text-text-primary">{agent.efficiency}%</p>
        </div>
        <div>
          <p className="text-text-secondary">Heartbeat</p>
          <p className="text-text-primary">{agent.heartbeat}</p>
        </div>
        <div>
          <p className="text-text-secondary">Tasks</p>
          <p className="text-text-primary">{agent.tasksCompleted}</p>
        </div>
        <div>
          <p className="text-text-secondary">Status</p>
          <p className={config.className}>{config.label}</p>
        </div>
      </div>
    </div>
  )
}
