import { X } from 'lucide-react'
import { OlympusTask } from '@/hooks/useOlympusStore'

interface TaskDetailModalProps {
  task: OlympusTask
  onClose: () => void
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const priorityColors: Record<string, string> = {
    low: 'text-text-secondary',
    normal: 'text-primary',
    high: 'text-warning',
    critical: 'text-error',
  }

  const statusHistory = [
    { status: 'inbox', label: 'INBOX', time: task.created },
    { status: 'assigned', label: 'ASSIGNED', time: task.assignee ? 'After inbox' : '—' },
    { status: 'in_progress', label: 'IN PROGRESS', time: '—' },
    { status: 'review', label: 'REVIEW', time: '—' },
    { status: 'done', label: 'DONE', time: '—' },
  ]

  const currentIndex = statusHistory.findIndex((s) => s.status === task.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-panel glow-border rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[rgba(15,15,18,0.95)] border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">{task.id}</span>
              <h3 className="font-display text-xl text-text-primary mt-1">{task.title}</h3>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Priority & Status */}
          <div className="flex gap-4">
            <div className="glass-panel p-3 flex-1">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">Priority</p>
              <p className={`font-mono uppercase text-sm mt-1 ${priorityColors[task.priority]}`}>
                {task.priority}
              </p>
            </div>
            <div className="glass-panel p-3 flex-1">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">Status</p>
              <p className="font-mono uppercase text-sm text-text-primary mt-1">
                {task.status.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="glass-panel p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Description</p>
              <p className="text-sm text-text-primary leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Assignee */}
          <div className="glass-panel p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Assigned To</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border border-primary bg-[rgba(184,150,90,0.15)] flex items-center justify-center">
                <span className="text-lg">
                  {task.assignee === 'ARGOS' ? '🔱' : task.assignee === 'ATLAS' ? '🏛️' : task.assignee === 'HERCULOS' ? '⚙️' : task.assignee === 'ATHENA' ? '🦉' : task.assignee === 'PROMETHEUS' ? '🔥' : task.assignee === 'APOLLO' ? '🎨' : task.assignee === 'HERMES' ? '📜' : '👤'}
                </span>
              </div>
              <span className="text-sm text-text-primary">{task.assignee ?? 'Unassigned'}</span>
            </div>
          </div>

          {/* Status History */}
          <div className="glass-panel p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-4">Status History</p>
            <div className="space-y-3">
              {statusHistory.map((step, index) => {
                const isCompleted = index <= currentIndex
                const isCurrent = index === currentIndex
                return (
                  <div key={step.status} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${isCompleted ? (isCurrent ? 'bg-primary animate-status-pulse' : 'bg-success') : 'bg-border'}`} />
                    <span className={`text-sm font-mono uppercase tracking-[0.15em] ${isCompleted ? 'text-text-primary' : 'text-text-muted'}`}>
                      {step.label}
                    </span>
                    <span className="text-xs text-text-muted ml-auto">{step.time}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="glass-panel p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-[rgba(255,255,255,0.04)] text-xs text-text-secondary font-mono uppercase tracking-[0.1em]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Created */}
          <div className="text-center">
            <p className="font-mono text-xs text-text-muted">Created {task.created}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
