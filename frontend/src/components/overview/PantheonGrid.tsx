import { useState } from 'react'
import { ShieldCheck, Zap, ShieldAlert } from 'lucide-react'
import { useOlympusStore } from '@/hooks/useOlympusStore'
import { AgentProfileModal } from '@/components/agents/AgentProfileModal'

const statusConfig = {
  active: {
    label: 'Active',
    icon: Zap,
    className: 'text-success',
    pulse: 'animate-status-pulse',
  },
  idle: {
    label: 'Idle',
    icon: ShieldCheck,
    className: 'text-text-muted',
    pulse: '',
  },
  blocked: {
    label: 'Blocked',
    icon: ShieldAlert,
    className: 'text-error',
    pulse: 'animate-alert-blink',
  },
}

export function PantheonGrid() {
  const agents = useOlympusStore((state) => state.agents)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => {
        const config = statusConfig[agent.status]
        const StatusIcon = config.icon
        return (
          <div
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className={`relative glass-panel glow-border-strong p-4 overflow-hidden cursor-pointer hover:border-primary transition-colors ${
              agent.status === 'active' ? 'animate-gold-breathe' : ''
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[rgba(184,150,90,0.08)] via-transparent to-transparent opacity-80" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.24em] text-text-muted">
                  {agent.role}
                </p>
                <h3 className="mt-2 text-lg font-display text-text-primary">
                  {agent.name}
                </h3>
                <p className="text-xs text-text-secondary font-mono uppercase tracking-[0.2em]">
                  {agent.specialization}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-full border border-border bg-[rgba(255,255,255,0.03)] flex items-center justify-center ${config.pulse}`}>
                <StatusIcon size={18} className={config.className} />
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted">
              <div>
                <p className="text-text-secondary">Model</p>
                <p className="text-text-primary">{agent.model}</p>
              </div>
              <div>
                <p className="text-text-secondary">Heartbeat</p>
                <p className="text-text-primary">{agent.heartbeat}</p>
              </div>
              <div>
                <p className="text-text-secondary">Reliability</p>
                <p className="text-text-primary">{agent.reliability}%</p>
              </div>
              <div>
                <p className="text-text-secondary">Efficiency</p>
                <p className="text-text-primary">{agent.efficiency}%</p>
              </div>
            </div>
          </div>
        )
      })}

      {selectedAgent && (
        <AgentProfileModal
          agentId={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}
