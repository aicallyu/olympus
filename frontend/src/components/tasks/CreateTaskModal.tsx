import { useState } from 'react'
import { X } from 'lucide-react'
import { useOlympusStore, TaskPriority } from '@/hooks/useOlympusStore'

interface CreateTaskModalProps {
  onClose: () => void
}

export function CreateTaskModal({ onClose }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [assignee, setAssignee] = useState('ARGOS')
  const addTask = useOlympusStore((state) => state.addTask)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newTask = {
      id: `OLY-${String(Date.now()).slice(-3)}`,
      title,
      description,
      priority,
      status: 'inbox' as const,
      assignee: assignee === 'Unassigned' ? null : assignee,
      created: new Date().toISOString(),
      tags: [],
    }
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })
      
      if (response.ok) {
        const result = await response.json()
        const createdTask = result.task || result
        addTask(createdTask)
        onClose()
        // Force refresh to show new task
        window.location.reload()
      } else {
        const errorText = await response.text()
        console.error('Failed to create task:', errorText)
        alert('Failed to create task: ' + errorText)
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-panel glow-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl text-primary">SUMMON TASK</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
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
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none"
              placeholder="Enter task title..."
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none resize-none"
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
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none"
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
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="ARGOS">ARGOS (Orchestrator)</option>
              <option value="ATLAS">ATLAS (Frontend)</option>
              <option value="HERCULOS">HERCULOS (Backend)</option>
              <option value="ATHENA">ATHENA (QA)</option>
              <option value="PROMETHEUS">PROMETHEUS (DevOps)</option>
              <option value="APOLLO">APOLLO (Design)</option>
              <option value="HERMES">HERMES (Documentation)</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full btn-primary py-3 mt-4 font-mono uppercase tracking-[0.2em] text-sm"
          >
            Create Task
          </button>
        </form>
      </div>
    </div>
  )
}
