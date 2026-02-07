import { useState, useEffect } from 'react'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { OlympusTask, TaskStatus, useOlympusStore } from '@/hooks/useOlympusStore'

interface TaskDetailModalProps {
  task: OlympusTask
  onClose: () => void
}

const priorityColors: Record<string, string> = {
  low: 'text-text-secondary',
  normal: 'text-primary',
  high: 'text-warning',
  critical: 'text-error',
}

const statusLabels: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  build_check: 'Build Check',
  deploy_check: 'Deploy Check',
  perception_check: 'Perception',
  human_checkpoint: 'Human Review',
  done: 'Done',
  auto_fix: 'Auto-Fix',
  escalated: 'Escalated',
  rejected: 'Rejected',
  review: 'Review',
  blocked: 'Blocked',
}

const statusOrder: TaskStatus[] = ['inbox', 'assigned', 'in_progress', 'review', 'done']

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [, setStatusHistory] = useState<Array<{ status: string; timestamp: string; notes?: string }>>([])
  
  const agents = useOlympusStore((state) => state.agents)
  const assignTask = useOlympusStore((state) => state.assignTask)
  const updateTaskStatus = useOlympusStore((state) => state.updateTaskStatus)
  const fetchAgents = useOlympusStore((state) => state.fetchAgents)

  // Fetch agents and status history on mount
  useEffect(() => {
    fetchAgents()
    fetchStatusHistory()
  }, [fetchAgents, task.id])

  const fetchStatusHistory = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.task?.status_history) {
          setStatusHistory(data.task.status_history)
        }
      }
    } catch (error) {
      console.error('Error fetching status history:', error)
    }
  }

  const handleAssigneeChange = async (agentId: string) => {
    if (agentId === task.assignee_id) {
      setShowAssigneeDropdown(false)
      return
    }
    
    setIsUpdating(true)
    await assignTask(task.id, agentId)
    setIsUpdating(false)
    setShowAssigneeDropdown(false)
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === task.status) {
      setShowStatusDropdown(false)
      return
    }

    // Validate status transitions
    if (task.status === 'in_progress' && newStatus === 'done') {
      alert('Tasks must pass through Review (ATHENA) before Done')
      setShowStatusDropdown(false)
      return
    }

    setIsUpdating(true)
    await updateTaskStatus(task.id, newStatus)
    setIsUpdating(false)
    setShowStatusDropdown(false)
  }

  // Get next valid statuses based on current status
  const getValidNextStatuses = (): TaskStatus[] => {
    switch (task.status) {
      case 'inbox':
        return ['assigned', 'in_progress', 'blocked']
      case 'assigned':
        return ['in_progress', 'inbox', 'blocked']
      case 'in_progress':
        return ['review', 'blocked', 'inbox']
      case 'review':
        return ['done', 'in_progress', 'blocked']
      case 'done':
        return ['review', 'in_progress']
      case 'blocked':
        return ['inbox', 'assigned', 'in_progress']
      default:
        return []
    }
  }

  const validNextStatuses = getValidNextStatuses()
  const currentStatusIndex = statusOrder.indexOf(task.status)

  const getAgentEmoji = (agentName: string | null) => {
    if (!agentName) return '👤'
    const emojiMap: Record<string, string> = {
      'ARGOS': '🔱',
      'ATLAS': '🏛️',
      'HERCULOS': '⚙️',
      'ATHENA': '🦉',
      'PROMETHEUS': '🔥',
      'APOLLO': '🎨',
      'HERMES': '📜',
    }
    return emojiMap[agentName] || '👤'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-panel glow-border rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[rgba(15,15,18,0.95)] border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">{task.id}</span>
              <h3 className="font-display text-xl text-text-primary mt-1">{task.title}</h3>
            </div>
            <button 
              onClick={onClose} 
              className="text-text-muted hover:text-text-primary transition-colors"
              disabled={isUpdating}
            >
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
            
            {/* Clickable Status */}
            <div className="glass-panel p-3 flex-1 relative">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">Status</p>
              <button
                onClick={() => {
                  setShowStatusDropdown(!showStatusDropdown)
                  setShowAssigneeDropdown(false)
                }}
                disabled={isUpdating || task.status === 'done'}
                className={`w-full text-left font-mono uppercase text-sm mt-1 flex items-center gap-2 transition-colors ${
                  task.status === 'done' ? 'text-success' : 'text-text-primary hover:text-primary'
                }`}
              >
                {isUpdating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    {statusLabels[task.status]}
                    {task.status !== 'done' && <ChevronDown size={14} />}
                  </>
                )}
              </button>
              
              {showStatusDropdown && validNextStatuses.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-[rgba(15,15,18,0.98)] border border-border rounded-lg shadow-xl py-1">
                  {validNextStatuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-[rgba(255,255,255,0.04)] hover:text-text-primary transition-colors"
                    >
                      → {statusLabels[status]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="glass-panel p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Description</p>
              <p className="text-sm text-text-primary leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Assignee with Dropdown */}
          <div className="glass-panel p-4 relative">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Assigned To</p>
            <button
              onClick={() => {
                setShowAssigneeDropdown(!showAssigneeDropdown)
                setShowStatusDropdown(false)
              }}
              disabled={isUpdating}
              className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <div className="h-10 w-10 rounded-full border border-primary bg-[rgba(184,150,90,0.15)] flex items-center justify-center">
                <span className="text-lg">{getAgentEmoji(task.assignee)}</span>
              </div>
              <div className="flex-1 text-left">
                <span className="text-sm text-text-primary">{task.assignee ?? 'Unassigned'}</span>
                {task.assignee && (
                  <p className="text-xs text-text-muted">
                    {agents.find(a => a.name === task.assignee)?.role || 'Agent'}
                  </p>
                )}
              </div>
              <ChevronDown size={16} className="text-text-muted" />
            </button>
            
            {showAssigneeDropdown && (
              <div className="absolute left-4 right-4 top-full mt-2 z-20 bg-[rgba(15,15,18,0.98)] border border-border rounded-lg shadow-xl py-1 max-h-[200px] overflow-y-auto">
                <button
                  onClick={() => handleAssigneeChange('')}
                  className="w-full px-4 py-3 text-left text-sm text-text-muted hover:bg-[rgba(255,255,255,0.04)] hover:text-text-primary transition-colors flex items-center gap-3"
                >
                  <div className="h-8 w-8 rounded-full border border-border bg-surface flex items-center justify-center">
                    <span>👤</span>
                  </div>
                  Unassigned
                </button>
                {agents.filter(a => a.status !== 'blocked').map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleAssigneeChange(agent.id)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center gap-3 ${
                      task.assignee_id === agent.id ? 'text-primary bg-[rgba(184,150,90,0.08)]' : 'text-text-secondary'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full border border-primary bg-[rgba(184,150,90,0.15)] flex items-center justify-center">
                      <span>{getAgentEmoji(agent.name)}</span>
                    </div>
                    <div>
                      <span>{agent.name}</span>
                      <p className="text-xs text-text-muted">{agent.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Progress */}
          <div className="glass-panel p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-4">Status Progress</p>
            <div className="space-y-3">
              {statusOrder.map((status, index) => {
                const isCompleted = index <= currentStatusIndex
                const isCurrent = index === currentStatusIndex
                return (
                  <div key={status} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      isCurrent ? 'bg-primary animate-status-pulse' : 
                      isCompleted ? 'bg-success' : 'bg-border'
                    }`} />
                    <span className={`text-sm font-mono uppercase tracking-[0.15em] ${
                      isCompleted ? 'text-text-primary' : 'text-text-muted'
                    }`}>
                      {statusLabels[status]}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-primary ml-auto">Current</span>
                    )}
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
