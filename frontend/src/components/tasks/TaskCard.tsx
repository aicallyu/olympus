import { useState, useRef, useEffect } from 'react'
import { GripVertical, ChevronDown, Loader2 } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { OlympusTask, TaskStatus, useOlympusStore } from '@/hooks/useOlympusStore'
import { TaskDetailModal } from './TaskDetailModal'

const priorityStyles: Record<string, string> = {
  low: 'bg-[rgba(148,163,184,0.16)] text-text-secondary',
  normal: 'bg-[rgba(184,150,90,0.18)] text-primary',
  high: 'bg-[rgba(245,158,11,0.18)] text-warning',
  critical: 'bg-[rgba(239,68,68,0.2)] text-error',
}

const statusLabels: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
}

interface TaskCardProps {
  task: OlympusTask
  isOverlay?: boolean
}

export function TaskCard({ task, isOverlay }: TaskCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const assigneeRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: Boolean(isOverlay),
  })

  const agents = useOlympusStore((state) => state.agents)
  const assignTask = useOlympusStore((state) => state.assignTask)
  const updateTaskStatus = useOlympusStore((state) => state.updateTaskStatus)
  const fetchAgents = useOlympusStore((state) => state.fetchAgents)

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false)
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const handleClick = () => {
    if (!isDragging && !isOverlay && !showAssigneeDropdown && !showStatusDropdown) {
      setIsDetailOpen(true)
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

    // Cannot skip review when going from in_progress to done
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

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={handleClick}
        className={`rounded-xl border border-border bg-[rgba(22,22,32,0.88)] p-4 transition-colors ${
          isOverlay ? 'shadow-2xl border-primary/40' : 'hover:border-primary/40 cursor-pointer'
        } ${isDragging ? 'opacity-60' : 'opacity-100'} ${isOverlay ? '' : 'cursor-grab active:cursor-grabbing'} animate-card-reveal`}
        {...(isOverlay ? {} : attributes)}
        {...(isOverlay ? {} : listeners)}
      >
        <div className="flex items-start justify-between">
          <span className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-[0.2em] ${priorityStyles[task.priority]}`}>
            {task.priority}
          </span>
          <GripVertical size={14} className="text-text-muted" />
        </div>
        
        <h4 className="mt-3 text-sm text-text-primary">{task.title}</h4>
        
        <div className="mt-3 flex flex-wrap gap-2">
          {task.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em]">
          {/* Clickable Assignee Dropdown */}
          <div ref={assigneeRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowAssigneeDropdown(!showAssigneeDropdown)
                setShowStatusDropdown(false)
              }}
              disabled={isUpdating}
              className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors disabled:opacity-50"
            >
              {isUpdating ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <>
                  {task.assignee ?? 'Unassigned'}
                  <ChevronDown size={10} />
                </>
              )}
            </button>
            
            {showAssigneeDropdown && (
              <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] bg-[rgba(15,15,18,0.98)] border border-border rounded-lg shadow-xl py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAssigneeChange('')
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-text-muted hover:bg-[rgba(255,255,255,0.04)] hover:text-text-primary transition-colors"
                >
                  Unassigned
                </button>
                {agents.filter(a => a.status !== 'blocked').map((agent) => (
                  <button
                    key={agent.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssigneeChange(agent.id)
                    }}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center gap-2 ${
                      task.assignee_id === agent.id ? 'text-primary bg-[rgba(184,150,90,0.08)]' : 'text-text-secondary'
                    }`}
                  >
                    <span>{agent.name}</span>
                    <span className="text-text-muted text-[9px]">({agent.role})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clickable Status Dropdown */}
          <div ref={statusRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowStatusDropdown(!showStatusDropdown)
                setShowAssigneeDropdown(false)
              }}
              disabled={isUpdating || task.status === 'done'}
              className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
                task.status === 'done' 
                  ? 'text-success' 
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              {isUpdating ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <>
                  {statusLabels[task.status]}
                  {task.status !== 'done' && <ChevronDown size={10} />}
                </>
              )}
            </button>
            
            {showStatusDropdown && validNextStatuses.length > 0 && (
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] bg-[rgba(15,15,18,0.98)] border border-border rounded-lg shadow-xl py-1">
                {validNextStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange(status)
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-[rgba(255,255,255,0.04)] hover:text-text-primary transition-colors"
                  >
                    → {statusLabels[status]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isDetailOpen && (
        <TaskDetailModal task={task} onClose={() => setIsDetailOpen(false)} />
      )}
    </>
  )
}
