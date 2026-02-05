import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useOlympusStore, TaskPriority } from '@/hooks/useOlympusStore'

interface CreateTaskModalProps {
  onClose: () => void
}

export function CreateTaskModal({ onClose }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [assignee, setAssignee] = useState('Unassigned')
  const [titleError, setTitleError] = useState('')
  
  const createTask = useOlympusStore((state) => state.createTask)
  const isLoading = useOlympusStore((state) => state.isLoading)
  const agents = useOlympusStore((state) => state.agents)
  const fetchAgents = useOlympusStore((state) => state.fetchAgents)

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const validateTitle = (value: string): boolean => {
    const trimmed = value.trim()
    if (!trimmed) {
      setTitleError('Title is required')
      return false
    }
    if (trimmed.length < 3) {
      setTitleError('Title must be at least 3 characters')
      return false
    }
    setTitleError('')
    return true
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTitle(value)
    if (titleError) validateTitle(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateTitle(title)) {
      return
    }

    const success = await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignee: assignee === 'Unassigned' ? undefined : assignee,
    })
    
    if (success) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-panel glow-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl text-primary">SUMMON TASK</h3>
          <button 
            onClick={onClose} 
            className="text-text-muted hover:text-text-primary transition-colors"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              disabled={isLoading}
              className={`w-full bg-surface border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors ${
                titleError ? 'border-error focus:border-error' : 'border-border focus:border-primary'
              }`}
              placeholder="Enter task title..."
            />
            {titleError && (
              <p className="mt-1 text-xs text-error font-mono">{titleError}</p>
            )}
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none resize-none transition-colors"
              placeholder="Enter task description..."
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              disabled={isLoading}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">
              Assignee
            </label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              disabled={isLoading}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              <option value="Unassigned">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.name}>
                  {agent.name} ({agent.role})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3 mt-4 font-mono uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
