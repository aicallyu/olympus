import { useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, Wrench, AlertTriangle } from 'lucide-react'
import { useOlympusStore } from '@/hooks/useOlympusStore'
import type { TaskVerification } from '@/hooks/useOlympusStore'

interface VerificationHistoryProps {
  taskId: string
}

const statusIcons: Record<string, typeof CheckCircle> = {
  pass: CheckCircle,
  fail: XCircle,
  auto_fix_attempted: Wrench,
  escalated: AlertTriangle,
}

const statusColors: Record<string, string> = {
  pass: 'text-success',
  fail: 'text-error',
  auto_fix_attempted: 'text-warning',
  escalated: 'text-error',
}

const gateLabelMap: Record<string, string> = {
  build_check: 'Build Guard',
  deploy_check: 'Deploy Verify',
  perception_check: 'Perception',
  human_checkpoint: 'Human Review',
}

export function VerificationHistory({ taskId }: VerificationHistoryProps) {
  const fetchVerifications = useOlympusStore((state) => state.fetchVerifications)
  const [verifications, setVerifications] = useState<TaskVerification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    fetchVerifications(taskId).then((data) => {
      if (mounted) {
        setVerifications(data)
        setIsLoading(false)
      }
    })
    return () => { mounted = false }
  }, [taskId, fetchVerifications])

  if (isLoading) {
    return (
      <div className="glass-panel p-5">
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-4">
          Verification History
        </h3>
        <div className="flex items-center justify-center py-8">
          <span className="text-xs text-text-muted font-mono animate-pulse">Loading...</span>
        </div>
      </div>
    )
  }

  if (verifications.length === 0) {
    return (
      <div className="glass-panel p-5">
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-4">
          Verification History
        </h3>
        <div className="flex items-center justify-center py-8">
          <span className="text-xs text-text-muted font-mono">No verification events yet</span>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel p-5">
      <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-4">
        Verification History
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[9px] top-0 bottom-0 w-px bg-border/30" />

        <div className="space-y-4">
          {verifications.map((v) => {
            const Icon = statusIcons[v.status] || Clock
            const color = statusColors[v.status] || 'text-text-muted'

            return (
              <div key={v.id} className="relative flex gap-4 pl-0">
                {/* Icon */}
                <div className={`relative z-10 flex-shrink-0 mt-0.5 ${color}`}>
                  <Icon size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs uppercase tracking-[0.1em] text-text-primary">
                      {gateLabelMap[v.gate] || v.gate}
                    </span>
                    <span className={`text-[10px] font-mono uppercase tracking-[0.2em] ${color}`}>
                      {v.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      Attempt #{v.attempt_number}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary mt-1">{v.summary}</p>

                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-mono text-text-muted">
                      by {v.verified_by}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Auto-fix info */}
                  {v.auto_fix_action && (
                    <div className="mt-2 rounded border border-warning/20 bg-[rgba(245,158,11,0.05)] px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-warning mb-1">
                        Auto-fix attempted
                      </p>
                      <p className="text-xs text-text-secondary">{v.auto_fix_action}</p>
                      {v.auto_fix_result && (
                        <p className="text-xs text-text-muted mt-0.5">{v.auto_fix_result}</p>
                      )}
                    </div>
                  )}

                  {/* Escalation context */}
                  {v.escalation_context && (
                    <div className="mt-2 rounded border border-error/20 bg-[rgba(239,68,68,0.05)] px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-error mb-1">
                        Escalation
                      </p>
                      <p className="text-xs text-text-secondary">{v.escalation_context}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
