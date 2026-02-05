import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { Filter, Plus } from 'lucide-react'
import { TaskCard } from './TaskCard'
import { CreateTaskModal } from './CreateTaskModal'
import { FilterModal } from './FilterModal'
import { TaskStatus, useOlympusStore, OlympusTask } from '@/hooks/useOlympusStore'

export function TaskBoard() {
  const tasks = useOlympusStore((state) => state.tasks)
  const columns = useOlympusStore((state) => state.columns)
  const moveTask = useOlympusStore((state) => state.moveTask)
  const [activeTask, setActiveTask] = useState<OlympusTask | null>(null)
  const [activeStatus, setActiveStatus] = useState<TaskStatus>('inbox')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const tasksByStatus = useMemo(() => {
    return columns.reduce<Record<TaskStatus, OlympusTask[]>>((acc, column) => {
      acc[column.id] = tasks.filter((task) => task.status === column.id)
      return acc
    }, {
      inbox: [],
      assigned: [],
      in_progress: [],
      review: [],
      done: [],
      blocked: [],
    })
  }, [columns, tasks])

  const activeColumn = columns.find((column) => column.id === activeStatus) ?? columns[0]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-text-muted">Task Board</p>
          <h2 className="text-2xl font-display mt-2">Operational Task Grid</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button 
            onClick={() => setIsFilterModalOpen(true)}
            className="btn-secondary flex min-h-[44px] w-full items-center justify-center gap-2 px-4 text-xs font-mono uppercase tracking-[0.2em] sm:w-auto"
          >
            <Filter size={14} />
            Filter
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex min-h-[44px] w-full items-center justify-center gap-2 px-4 text-xs font-mono uppercase tracking-[0.2em] sm:w-auto"
          >
            <Plus size={14} />
            New Task
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) => {
          const task = tasks.find((item) => item.id === event.active.id)
          setActiveTask(task ?? null)
        }}
        onDragEnd={(event) => {
          const { active, over } = event
          if (over) {
            moveTask(String(active.id), over.id as TaskStatus)
          }
          setActiveTask(null)
        }}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex gap-2 overflow-x-auto pb-2 sm:hidden">
          {columns.map((column) => (
            <button
              key={column.id}
              type="button"
              onClick={() => setActiveStatus(column.id)}
              className={`min-h-[44px] whitespace-nowrap rounded-full px-4 text-[10px] font-mono uppercase tracking-[0.2em] border transition-colors ${
                activeStatus === column.id
                  ? 'border-primary text-primary bg-[rgba(184,150,90,0.12)]'
                  : 'border-border text-text-muted hover:text-text-primary'
              }`}
            >
              {column.label}
              <span className="ml-2 text-text-muted">{tasksByStatus[column.id].length}</span>
            </button>
          ))}
        </div>

        <div className="sm:hidden">
          {activeColumn ? (
            <TaskColumn
              columnId={activeColumn.id}
              label={activeColumn.label}
              description={activeColumn.description}
              tasks={tasksByStatus[activeColumn.id]}
              isCompact
            />
          ) : null}
        </div>

        <div className="hidden sm:flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <TaskColumn
              key={column.id}
              columnId={column.id}
              label={column.label}
              description={column.description}
              tasks={tasksByStatus[column.id]}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {isCreateModalOpen && (
        <CreateTaskModal onClose={() => setIsCreateModalOpen(false)} />
      )}
      {isFilterModalOpen && (
        <FilterModal onClose={() => setIsFilterModalOpen(false)} />
      )}
    </div>
  )
}

interface TaskColumnProps {
  columnId: TaskStatus
  label: string
  description: string
  tasks: OlympusTask[]
  isCompact?: boolean
}

function TaskColumn({ columnId, label, description, tasks, isCompact = false }: TaskColumnProps) {
  const { setNodeRef } = useDroppableColumn(columnId)

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 ${isCompact ? 'w-full' : 'w-72'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-mono uppercase tracking-[0.2em] text-xs text-text-secondary">
            {label}
          </h3>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted mt-1">
            {description}
          </p>
        </div>
        <span className="px-2 py-1 rounded text-[10px] font-mono uppercase tracking-[0.2em] bg-[rgba(255,255,255,0.04)] text-text-muted">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

function useDroppableColumn(id: TaskStatus) {
  return useDroppable({ id })
}
