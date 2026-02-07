import { useState } from 'react'
import { CheckCircle, XCircle, Loader2, Eye } from 'lucide-react'
import { useOlympusStore } from '@/hooks/useOlympusStore'
import type { OlympusTask, AcceptanceCriterion } from '@/hooks/useOlympusStore'

interface HumanCheckpointPanelProps {
  task: OlympusTask
  onComplete?: () => void
}

export function HumanCheckpointPanel({ task, onComplete }: HumanCheckpointPanelProps) {
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const approveTask = useOlympusStore((state) => state.approveTask)
  const rejectTask = useOlympusStore((state) => state.rejectTask)

  const criteria = task.acceptance_criteria || []
  const passedCriteria = criteria.filter((c: AcceptanceCriterion) => c.verified)
  const failedCriteria = criteria.filter((c: AcceptanceCriterion) => !c.verified)

  const isAtCheckpoint = task.status === 'human_checkpoint'

  const handleApprove = async () => {
    setIsProcessing(true)
    const success = await approveTask(task.id, notes)
    setIsProcessing(false)
    if (success) onComplete?.()
  }

  const handleReject = async () => {
    if (!notes.trim()) {
      useOlympusStore.getState().showToast('Please add rejection notes', 'error')
      return
    }
    setIsProcessing(true)
    const success = await rejectTask(task.id, notes)
    setIsProcessing(false)
    if (success) onComplete?.()
  }

  return (
    <div className="glass-panel glow-border p-5">
      <div className="flex items-center gap-3 mb-5">
        <Eye size={18} className="text-primary" />
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Human Checkpoint
        </h3>
        {isAtCheckpoint && (
          <span className="ml-auto px-2 py-0.5 rounded bg-[rgba(184,150,90,0.18)] text-primary text-[10px] font-mono uppercase animate-gold-breathe">
            Awaiting Decision
          </span>
        )}
      </div>

      {/* Task summary */}
      <div className="rounded-lg border border-border bg-[rgba(22,22,32,0.6)] p-4 mb-4">
        <h4 className="text-sm text-text-primary font-medium">{task.title}</h4>
        {task.description && (
          <p className="text-xs text-text-secondary mt-1">{task.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[10px] font-mono uppercase text-text-muted">
            {task.assignee || 'Unassigned'}
          </span>
          <span className="text-[10px] font-mono uppercase text-text-muted">
            {task.project_id || 'olymp'}
          </span>
        </div>
      </div>

      {/* Acceptance criteria results */}
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted mb-2">
          Acceptance Criteria ({passedCriteria.length}/{criteria.length} verified)
        </p>
        <div className="space-y-2">
          {criteria.map((c: AcceptanceCriterion) => (
            <div
              key={c.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                c.verified
                  ? 'border-success/20 bg-[rgba(34,197,94,0.04)]'
                  : 'border-error/20 bg-[rgba(239,68,68,0.04)]'
              }`}
            >
              {c.verified ? (
                <CheckCircle size={14} className="text-success flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle size={14} className="text-error flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary">{c.criterion}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-mono text-text-muted uppercase">
                    {c.type.replace('_', ' ')}
                  </span>
                  {c.verified_by && (
                    <span className="text-[9px] font-mono text-text-muted">
                      by {c.verified_by}
                    </span>
                  )}
                  {c.evidence_url && (
                    <a
                      href={c.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-mono text-info hover:underline"
                    >
                      evidence
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gate progress summary */}
      {task.gate_status && (
        <div className="rounded-lg border border-border bg-[rgba(22,22,32,0.6)] p-3 mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted mb-2">
            Gate Summary
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(task.gate_status).map(([gate, status]) => (
              <div key={gate} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status.status === 'passed' ? 'bg-success' :
                  status.status === 'failed' ? 'bg-error' :
                  status.status === 'running' ? 'bg-info animate-status-pulse' :
                  'bg-border'
                }`} />
                <span className="text-[10px] font-mono text-text-secondary capitalize">
                  {gate.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision area */}
      {isAtCheckpoint && (
        <>
          <div className="mb-4">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted block mb-1.5">
              Notes {failedCriteria.length > 0 ? '(required for rejection)' : '(optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add feedback, instructions, or rejection reason..."
              rows={3}
              className="w-full rounded-lg border border-border bg-[rgba(22,22,32,0.8)] px-3 py-2 text-sm text-text-primary placeholder-text-muted font-mono focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-success/20 border border-success/30 px-4 py-3 text-sm font-mono uppercase tracking-[0.1em] text-success hover:bg-success/30 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle size={16} />
                  Approve
                </>
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-error/10 border border-error/30 px-4 py-3 text-sm font-mono uppercase tracking-[0.1em] text-error hover:bg-error/20 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <XCircle size={16} />
                  Reject
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
