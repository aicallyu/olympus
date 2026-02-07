import { useState, useEffect } from 'react'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import { useOlympusStore, TaskPriority, TaskType, AcceptanceCriterion } from '@/hooks/useOlympusStore'
import { ACCEPTANCE_TEMPLATES, TASK_TYPE_LABELS } from '@/lib/acceptance-templates'

interface CreateTaskModalProps {
  onClose: () => void
}

export function CreateTaskModal({ onClose }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [assignee, setAssignee] = useState('Unassigned')
  const [titleError, setTitleError] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('frontend')
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>(
    () => structuredClone(ACCEPTANCE_TEMPLATES.frontend)
  )
  const [criteriaError, setCriteriaError] = useState('')

  const createTask = useOlympusStore((state) => state.createTask)
  const isLoading = useOlympusStore((state) => state.isLoading)
  const agents = useOlympusStore((state) => state.agents)
  const fetchAgents = useOlympusStore((state) => state.fetchAgents)

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const handleTaskTypeChange = (type: TaskType) => {
    setTaskType(type)
    setCriteria(structuredClone(ACCEPTANCE_TEMPLATES[type]))
    setCriteriaError('')
  }

  const handleCriterionTextChange = (index: number, text: string) => {
    setCriteria((prev) => prev.map((c, i) => i === index ? { ...c, criterion: text } : c))
    if (criteriaError) setCriteriaError('')
  }

  const handleAddCriterion = () => {
    const nextId = `custom-${Date.now()}`
    setCriteria((prev) => [
      ...prev,
      {
        id: nextId,
        criterion: '',
        type: 'browser_test' as const,
        verified: false,
        verified_by: null,
        verified_at: null,
        evidence_url: null,
      },
    ])
  }

  const handleRemoveCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index))
  }

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

    if (!validateTitle(title)) return

    const validCriteria = criteria.filter((c) => c.criterion.trim() !== '')
    if (validCriteria.length === 0) {
      setCriteriaError('At least one acceptance criterion is required')
      return
    }

    const success = await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignee: assignee === 'Unassigned' ? undefined : assignee,
      acceptance_criteria: validCriteria,
    })

    if (success) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-panel glow-border rounded-lg p-6 max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Acceptance Criteria */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
                Acceptance Criteria *
              </label>
              <select
                value={taskType}
                onChange={(e) => handleTaskTypeChange(e.target.value as TaskType)}
                disabled={isLoading}
                className="bg-surface border border-border rounded px-2 py-1 text-xs text-text-secondary focus:border-primary focus:outline-none transition-colors"
              >
                {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((type) => (
                  <option key={type} value={type}>{TASK_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {criteria.map((criterion, index) => (
                <div key={criterion.id} className="flex items-start gap-2">
                  <span className="mt-3 text-[10px] font-mono text-text-muted w-4 shrink-0 text-right">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={criterion.criterion}
                    onChange={(e) => handleCriterionTextChange(index, e.target.value)}
                    disabled={isLoading}
                    className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
                    placeholder="Describe acceptance criterion..."
                  />
                  <span className="mt-2 text-[9px] font-mono text-text-muted uppercase w-16 shrink-0">
                    {criterion.type === 'browser_test' ? 'browser' : criterion.type === 'build_check' ? 'build' : 'code'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(index)}
                    disabled={isLoading}
                    className="mt-2 text-text-muted hover:text-error transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddCriterion}
              disabled={isLoading}
              className="mt-2 flex items-center gap-1 text-xs font-mono text-text-muted hover:text-primary transition-colors"
            >
              <Plus size={12} />
              Add criterion
            </button>

            {criteriaError && (
              <p className="mt-1 text-xs text-error font-mono">{criteriaError}</p>
            )}
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
