import { useMemo } from 'react'
import { Shield, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import type { OlympusTask, GateStatus } from '@/hooks/useOlympusStore'

interface TaskPipelineViewProps {
  task: OlympusTask
  onGateClick?: (gate: string) => void
}

const gates = [
  { id: 'build_check', label: 'Build Guard', icon: Shield, description: 'TypeScript + Build + Lint' },
  { id: 'deploy_check', label: 'Deploy Verify', icon: Shield, description: 'URL loads, env vars, branch' },
  { id: 'perception_check', label: 'Perception', icon: Shield, description: 'PROMETHEUS browser tests' },
  { id: 'human_checkpoint', label: 'Human Review', icon: Shield, description: 'Final approval by Juan' },
] as const

const gateStatusStyles: Record<string, { dot: string; border: string; text: string; label: string }> = {
  pending: { dot: 'bg-border', border: 'border-border', text: 'text-text-muted', label: 'Pending' },
  running: { dot: 'bg-info animate-status-pulse', border: 'border-info/40', text: 'text-info', label: 'Running' },
  passed: { dot: 'bg-success', border: 'border-success/40', text: 'text-success', label: 'Passed' },
  failed: { dot: 'bg-error', border: 'border-error/40', text: 'text-error', label: 'Failed' },
}

export function TaskPipelineView({ task, onGateClick }: TaskPipelineViewProps) {
  const gateData = useMemo(() => {
    return gates.map((gate) => {
      const status: GateStatus = task.gate_status?.[gate.id] || {
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        last_error: null,
        passed_at: null,
      }
      return { ...gate, status }
    })
  }, [task.gate_status])

  const passedCount = gateData.filter((g) => g.status.status === 'passed').length

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
          Verification Pipeline
        </h3>
        <span className="font-mono text-xs text-text-muted">
          {passedCount}/{gates.length} gates passed
        </span>
      </div>

      <div className="space-y-3">
        {gateData.map((gate, index) => {
          const styles = gateStatusStyles[gate.status.status] || gateStatusStyles.pending
          const isClickable = gate.status.status !== 'pending'
          const GateIcon = gate.icon

          return (
            <div key={gate.id}>
              <button
                onClick={() => isClickable && onGateClick?.(gate.id)}
                disabled={!isClickable}
                className={`w-full text-left rounded-lg border p-4 transition-all ${styles.border} ${
                  isClickable ? 'hover:bg-[rgba(255,255,255,0.02)] cursor-pointer' : 'opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {gate.status.status === 'running' ? (
                      <Loader2 size={18} className="text-info animate-spin" />
                    ) : gate.status.status === 'passed' ? (
                      <CheckCircle size={18} className="text-success" />
                    ) : gate.status.status === 'failed' ? (
                      <XCircle size={18} className="text-error" />
                    ) : (
                      <GateIcon size={18} className="text-text-muted" />
                    )}
                  </div>

                  {/* Gate info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm uppercase tracking-[0.1em] text-text-primary">
                        Gate {index + 1}: {gate.label}
                      </span>
                      <span className={`text-[10px] font-mono uppercase tracking-[0.2em] ${styles.text}`}>
                        {styles.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{gate.description}</p>
                  </div>

                  {/* Attempts badge */}
                  {gate.status.attempts > 0 && (
                    <div className="flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        gate.status.attempts >= gate.status.max_attempts
                          ? 'bg-[rgba(239,68,68,0.15)] text-error'
                          : 'bg-[rgba(184,150,90,0.12)] text-primary'
                      }`}>
                        {gate.status.attempts}/{gate.status.max_attempts}
                      </span>
                    </div>
                  )}
                </div>

                {/* Error message */}
                {gate.status.last_error && (
                  <div className="mt-2 flex items-start gap-2 pl-9">
                    <AlertTriangle size={12} className="text-error flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-error/80 font-mono break-all">
                      {gate.status.last_error}
                    </p>
                  </div>
                )}

                {/* Passed timestamp */}
                {gate.status.passed_at && (
                  <p className="mt-1 pl-9 text-[10px] text-text-muted font-mono">
                    Passed: {new Date(gate.status.passed_at).toLocaleString()}
                  </p>
                )}
              </button>

              {/* Connector line */}
              {index < gates.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className={`w-px h-3 ${
                    gate.status.status === 'passed' ? 'bg-success/40' : 'bg-border/40'
                  }`} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
