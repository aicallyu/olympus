import { useEffect, useState } from 'react'
import { X, Zap, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react'
import { useOlympusStore } from '@/hooks/useOlympusStore'
import { supabase } from '@/lib/supabase'

interface AgentProfileModalProps {
  agentId: string
  onClose: () => void
}

const AGENT_EMOJIS: Record<string, string> = {
  ARGOS: '🔱',
  ATLAS: '🏛️',
  HERCULOS: '⚙️',
  ATHENA: '🦉',
  PROMETHEUS: '🔥',
  APOLLO: '🎨',
  HERMES: '📜',
  Claude: '🧠',
}

const SOUL_DESCRIPTIONS: Record<string, string> = {
  ARGOS: 'Master orchestrator of the OLYMP system. Strategic, decisive, and focused on mission success. Direct communication style with dry wit.',
  ATLAS: 'Frontend engineering specialist. Detail-oriented, pixel-perfect implementation, obsessed with user experience and responsive design.',
  HERCULOS: 'Backend forge master. Builds robust APIs and database architectures. Values reliability, performance, and clean code above all.',
  ATHENA: 'Quality assurance and strategic wisdom. Analytical, thorough, and relentless in pursuit of excellence. No bug escapes her notice.',
  PROMETHEUS: 'DevOps and automation fire-bringer. Infrastructure as code, CI/CD pipelines, and deployment automation are his domain.',
  APOLLO: 'Design and visual arts specialist. Creates premium aesthetics, animations, and user interfaces that feel divine.',
  HERMES: 'Documentation and communication messenger. Ensures knowledge is captured, organized, and accessible to all agents and humans.',
  Claude: 'Architecture and strategy advisor. Provides high-level design guidance, code review, and strategic direction for the team.',
}

export function AgentProfileModal({ agentId, onClose }: AgentProfileModalProps) {
  const agent = useOlympusStore((state) => state.agents.find((a) => a.id === agentId))
  const fetchAgents = useOlympusStore((state) => state.fetchAgents)
  const showToast = useOlympusStore((state) => state.showToast)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single()

        if (!error && data) {
          setProfile(data)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [agentId])

  const handleRestartSession = async () => {
    setActionLoading('restart')
    try {
      const { error } = await supabase
        .from('agents')
        .update({ status: 'idle', current_task_id: null, updated_at: new Date().toISOString() })
        .eq('id', agentId)

      if (error) throw error

      showToast(`${agent?.name} session restarted`, 'success')
      await fetchAgents()
    } catch (err) {
      console.error('Error restarting session:', err)
      showToast('Failed to restart session', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEscalateModel = async () => {
    if (!agent?.modelEscalation || !profile?.model_primary) {
      showToast('No escalation model configured', 'info')
      return
    }

    const escalationModel = profile.model_escalation
    if (!escalationModel || escalationModel === profile.model_primary) {
      showToast('Already at escalation model', 'info')
      return
    }

    setActionLoading('escalate')
    try {
      const { error } = await supabase
        .from('agents')
        .update({ model_primary: escalationModel, updated_at: new Date().toISOString() })
        .eq('id', agentId)

      if (error) throw error

      showToast(`${agent?.name} escalated to ${escalationModel.split('/').pop()}`, 'success')
      setProfile((prev: any) => prev ? { ...prev, model_primary: escalationModel } : prev)
      await fetchAgents()
    } catch (err) {
      console.error('Error escalating model:', err)
      showToast('Failed to escalate model', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (!agent) return null

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
        <div className="h-full w-full max-w-md glass-panel glow-border-strong flex items-center justify-center">
          <p className="font-mono text-text-muted">Loading profile...</p>
        </div>
      </div>
    )
  }

  const statusConfig = {
    active: { icon: Zap, className: 'text-success', label: 'Active' },
    idle: { icon: ShieldCheck, className: 'text-text-muted', label: 'Idle' },
    blocked: { icon: ShieldAlert, className: 'text-error', label: 'Blocked' },
  }
  const StatusIcon = statusConfig[agent.status].icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="h-full w-full max-w-md glass-panel glow-border-strong overflow-y-auto">
        <div className="sticky top-0 bg-[rgba(15,15,18,0.95)] border-b border-border p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl text-primary">Agent Profile</h3>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full border-2 border-primary bg-[rgba(184,150,90,0.15)] flex items-center justify-center">
              <span className="text-3xl">{AGENT_EMOJIS[agent.name] || '📜'}</span>
            </div>
            <div>
              <h2 className="text-xl font-display text-text-primary">{agent.name}</h2>
              <p className="text-sm text-text-secondary font-mono uppercase tracking-[0.2em]">{agent.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon size={14} className={statusConfig[agent.status].className} />
                <span className={`text-xs font-mono uppercase ${statusConfig[agent.status].className}`}>
                  {statusConfig[agent.status].label}
                </span>
              </div>
            </div>
          </div>

          {/* Specialization */}
          <div className="glass-panel p-4">
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Specialization</h4>
            <p className="text-sm text-text-primary">{agent.specialization}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">Tasks Completed</p>
              <p className="text-2xl font-display text-primary mt-1">{agent.tasksCompleted}</p>
            </div>
            <div className="glass-panel p-4 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">Reliability</p>
              <p className="text-2xl font-display text-primary mt-1">{agent.reliability}%</p>
            </div>
            <div className="glass-panel p-4 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">Efficiency</p>
              <p className="text-2xl font-display text-primary mt-1">{agent.efficiency}%</p>
            </div>
            <div className="glass-panel p-4 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">Model</p>
              <p className="text-sm font-mono text-text-primary mt-2">{agent.model}</p>
            </div>
          </div>

          {/* SOUL Summary */}
          <div className="glass-panel p-4">
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">SOUL Personality</h4>
            <p className="text-sm text-text-primary leading-relaxed">
              {SOUL_DESCRIPTIONS[agent.name] || `${agent.role} agent in the OLYMP system.`}
            </p>
          </div>

          {/* Current Status */}
          <div className="glass-panel p-4">
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Current Status</h4>
            <p className="text-sm text-text-primary">{agent.heartbeat}</p>
            {profile && profile.activities && profile.activities[0] && (
              <p className="text-xs text-text-muted mt-2 font-mono">Latest: {profile.activities[0].action}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleRestartSession}
              disabled={actionLoading !== null}
              className="flex-1 btn-secondary py-3 font-mono uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading === 'restart' ? (
                <><Loader2 size={14} className="animate-spin" /> Restarting...</>
              ) : (
                'Restart Session'
              )}
            </button>
            <button
              onClick={handleEscalateModel}
              disabled={actionLoading !== null}
              className="flex-1 btn-primary py-3 font-mono uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading === 'escalate' ? (
                <><Loader2 size={14} className="animate-spin" /> Escalating...</>
              ) : (
                'Escalate Model'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
