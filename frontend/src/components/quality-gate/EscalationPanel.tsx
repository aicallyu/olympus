import { AlertTriangle, RotateCcw, UserCheck, Edit3, ArrowRight } from 'lucide-react'
import type { OlympusTask, GateStatus } from '@/hooks/useOlympusStore'

interface EscalationPanelProps {
  task: OlympusTask
  onAction?: (action: string) => void
}

const gateLabelMap: Record<string, string> = {
  build_check: 'Build Guard',
  deploy_check: 'Deploy Verify',
  perception_check: 'Perception Check',
  human_checkpoint: 'Human Review',
}

export function EscalationPanel({ task, onAction }: EscalationPanelProps) {
  const isEscalated = task.status === 'escalated'

  // Find the gate that caused escalation (the one with max attempts reached)
  const failedGate = task.gate_status
    ? Object.entries(task.gate_status).find(([, status]) =>
        status.status === 'failed' && status.attempts >= status.max_attempts
      )
    : null

  const failedGateId = failedGate?.[0] || 'unknown'
  const failedGateStatus: GateStatus = failedGate?.[1] || {
    status: 'failed',
    attempts: 3,
    max_attempts: 3,
    last_error: null,
    passed_at: null,
  }

  if (!isEscalated) return null

  return (
    <div className="glass-panel p-5 border-error/30">
      <div className="flex items-center gap-3 mb-5">
        <AlertTriangle size={18} className="text-error" />
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-error">
          Escalation Required
        </h3>
        <span className="ml-auto px-2 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-error text-[10px] font-mono uppercase">
          {failedGateStatus.attempts} attempts exhausted
        </span>
      </div>

      {/* What failed */}
      <div className="rounded-lg border border-error/20 bg-[rgba(239,68,68,0.04)] p-4 mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-error mb-2">
          What Failed
        </p>
        <p className="text-sm text-text-primary">
          {gateLabelMap[failedGateId] || failedGateId} failed after {failedGateStatus.attempts} auto-fix attempts
        </p>
        {failedGateStatus.last_error && (
          <div className="mt-2 rounded border border-border bg-[rgba(0,0,0,0.3)] p-2">
            <p className="text-xs text-error/80 font-mono break-all">
              {failedGateStatus.last_error}
            </p>
          </div>
        )}
      </div>

      {/* Task context */}
      <div className="rounded-lg border border-border bg-[rgba(22,22,32,0.6)] p-4 mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted mb-2">
          Task Context
        </p>
        <h4 className="text-sm text-text-primary">{task.title}</h4>
        {task.description && (
          <p className="text-xs text-text-secondary mt-1">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] font-mono text-text-muted uppercase">
            {task.assignee || 'Unassigned'}
          </span>
          <span className="text-[10px] font-mono text-text-muted uppercase">
            {task.project_id || 'olymp'}
          </span>
        </div>
      </div>

      {/* Resolution options */}
      <div className="mb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted mb-3">
          Resolution Options
        </p>
        <div className="space-y-2">
          <button
            onClick={() => onAction?.('retry_with_instructions')}
            className="w-full flex items-center gap-3 rounded-lg border border-border hover:border-primary/40 bg-[rgba(22,22,32,0.6)] p-3 transition-colors text-left group"
          >
            <RotateCcw size={16} className="text-text-muted group-hover:text-primary transition-colors" />
            <div className="flex-1">
              <p className="text-sm text-text-primary">Send back with instructions</p>
              <p className="text-[10px] text-text-muted">Return to agent with specific fix guidance</p>
            </div>
            <ArrowRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={() => onAction?.('reassign')}
            className="w-full flex items-center gap-3 rounded-lg border border-border hover:border-primary/40 bg-[rgba(22,22,32,0.6)] p-3 transition-colors text-left group"
          >
            <UserCheck size={16} className="text-text-muted group-hover:text-primary transition-colors" />
            <div className="flex-1">
              <p className="text-sm text-text-primary">Reassign to different agent</p>
              <p className="text-[10px] text-text-muted">Try a different approach with another agent</p>
            </div>
            <ArrowRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={() => onAction?.('adjust_criteria')}
            className="w-full flex items-center gap-3 rounded-lg border border-border hover:border-primary/40 bg-[rgba(22,22,32,0.6)] p-3 transition-colors text-left group"
          >
            <Edit3 size={16} className="text-text-muted group-hover:text-primary transition-colors" />
            <div className="flex-1">
              <p className="text-sm text-text-primary">Adjust acceptance criteria</p>
              <p className="text-[10px] text-text-muted">Modify criteria that may be too strict</p>
            </div>
            <ArrowRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
          </button>
        </div>
      </div>
    </div>
  )
}
