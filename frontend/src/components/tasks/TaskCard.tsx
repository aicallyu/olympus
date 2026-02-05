import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { OlympusTask } from '@/hooks/useOlympusStore'
import { TaskDetailModal } from './TaskDetailModal'

const priorityStyles: Record<string, string> = {
  low: 'bg-[rgba(148,163,184,0.16)] text-text-secondary',
  normal: 'bg-[rgba(184,150,90,0.18)] text-primary',
  high: 'bg-[rgba(245,158,11,0.18)] text-warning',
  critical: 'bg-[rgba(239,68,68,0.2)] text-error',
}

interface TaskCardProps {
  task: OlympusTask
  isOverlay?: boolean
}

export function TaskCard({ task, isOverlay }: TaskCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: Boolean(isOverlay),
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const interactive = !isOverlay

  const handleClick = () => {
    if (!isDragging && !isOverlay) {
      setIsDetailOpen(true)
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={handleClick}
        className={`rounded-xl border border-border bg-[rgba(22,22,32,0.88)] p-4 transition-colors ${
          isOverlay ? 'shadow-2xl border-primary/40' : 'hover:border-primary/40 cursor-pointer'
        } ${isDragging ? 'opacity-60' : 'opacity-100'} ${isOverlay ? '' : 'cursor-grab active:cursor-grabbing'} animate-card-reveal`}
        {...(interactive ? attributes : {})}
        {...(interactive ? listeners : {})}
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
      <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted">
        <span>{task.assignee ?? 'Unassigned'}</span>
        <span>{task.created}</span>
      </div>
    </div>

    {isDetailOpen && (
      <TaskDetailModal task={task} onClose={() => setIsDetailOpen(false)} />
    )}
    </>
  )
}
