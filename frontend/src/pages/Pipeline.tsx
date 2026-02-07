import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useOlympusStore } from '@/hooks/useOlympusStore'
import type { OlympusTask } from '@/hooks/useOlympusStore'
import { TaskPipelineView } from '@/components/quality-gate/TaskPipelineView'
import { VerificationHistory } from '@/components/quality-gate/VerificationHistory'
import { HumanCheckpointPanel } from '@/components/quality-gate/HumanCheckpointPanel'
import { EscalationPanel } from '@/components/quality-gate/EscalationPanel'

export function Pipeline() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const tasks = useOlympusStore((state) => state.tasks)
  const fetchTasks = useOlympusStore((state) => state.fetchTasks)
  const fetchAgents = useOlympusStore((state) => state.fetchAgents)
  const showToast = useOlympusStore((state) => state.showToast)

  const [selectedGate, setSelectedGate] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents().then(() => fetchTasks())
  }, [fetchAgents, fetchTasks])

  const task: OlympusTask | undefined = useMemo(
    () => tasks.find((t) => t.id === taskId),
    [tasks, taskId]
  )

  if (!taskId) {
    return <PipelineList />
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-xs text-text-muted font-mono animate-pulse">Loading task...</span>
      </div>
    )
  }

  const handleGateClick = (gate: string) => {
    setSelectedGate(selectedGate === gate ? null : gate)
  }

  const handleEscalationAction = (action: string) => {
    showToast(`Escalation action: ${action} — coming in Phase 6`, 'info')
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/pipeline')}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="font-mono text-xs uppercase tracking-[0.2em]">Back</span>
        </button>
      </div>

      {/* Task header */}
      <div className="glass-panel p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">{task.id}</p>
            <h2 className="text-lg text-text-primary mt-1">{task.title}</h2>
            {task.description && (
              <p className="text-sm text-text-secondary mt-1">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-[rgba(184,150,90,0.12)] text-primary text-[10px] font-mono uppercase">
              {task.status.replace('_', ' ')}
            </span>
            <span className="px-2 py-1 rounded bg-[rgba(184,150,90,0.12)] text-primary text-[10px] font-mono uppercase">
              {task.project_id || 'olymp'}
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="mb-5">
        <TaskPipelineView task={task} onGateClick={handleGateClick} />
      </div>

      {/* Conditional panels based on task state */}
      {task.status === 'human_checkpoint' && (
        <div className="mb-5">
          <HumanCheckpointPanel task={task} onComplete={() => fetchTasks()} />
        </div>
      )}

      {task.status === 'escalated' && (
        <div className="mb-5">
          <EscalationPanel task={task} onAction={handleEscalationAction} />
        </div>
      )}

      {/* Verification history */}
      <VerificationHistory taskId={task.id} />
    </div>
  )
}

function PipelineList() {
  const tasks = useOlympusStore((state) => state.tasks)
  const fetchTasks = useOlympusStore((state) => state.fetchTasks)
  const fetchAgents = useOlympusStore((state) => state.fetchAgents)
  const selectedProjectId = useOlympusStore((state) => state.selectedProjectId)
  const navigate = useNavigate()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    fetchAgents().then(() => fetchTasks())
    const interval = setInterval(() => fetchTasks(), 10000)
    return () => clearInterval(interval)
  }, [fetchAgents, fetchTasks])

  const gateStatuses = ['build_check', 'deploy_check', 'perception_check', 'human_checkpoint', 'auto_fix', 'escalated', 'done']

  const pipelineTasks = useMemo(() => {
    let filtered = tasks.filter((t) => gateStatuses.includes(t.status))

    if (selectedProjectId && selectedProjectId !== 'all') {
      filtered = filtered.filter((t) => (t.project_id || 'olymp') === selectedProjectId)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((t) => t.status === filterStatus)
    }

    return filtered
  }, [tasks, selectedProjectId, filterStatus])

  const statusLabels: Record<string, string> = {
    all: 'All',
    build_check: 'Build Check',
    deploy_check: 'Deploy Check',
    perception_check: 'Perception',
    human_checkpoint: 'Human Review',
    auto_fix: 'Auto-Fix',
    escalated: 'Escalated',
    done: 'Done',
  }

  const statusColors: Record<string, string> = {
    build_check: 'text-info',
    deploy_check: 'text-info',
    perception_check: 'text-info',
    human_checkpoint: 'text-primary',
    auto_fix: 'text-warning',
    escalated: 'text-error',
    done: 'text-success',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl uppercase tracking-[0.15em] text-primary">Pipeline</h1>
          <p className="text-xs text-text-muted font-mono uppercase tracking-[0.2em] mt-1">
            Quality Gate Verification Chain
          </p>
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 rounded-lg border border-border bg-[rgba(22,22,32,0.6)] px-3 py-1.5 hover:border-primary/40 transition-colors"
          >
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-text-primary">
              {statusLabels[filterStatus]}
            </span>
            <ChevronDown size={12} className="text-text-muted" />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] bg-[rgba(15,15,18,0.98)] border border-border rounded-lg shadow-xl py-1">
              {Object.entries(statusLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => { setFilterStatus(value); setShowFilter(false) }}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-[rgba(255,255,255,0.04)] transition-colors ${
                    filterStatus === value ? 'text-primary' : 'text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {pipelineTasks.length === 0 ? (
        <div className="glass-panel p-10 flex flex-col items-center justify-center">
          <p className="text-sm text-text-muted font-mono">No tasks in the pipeline</p>
          <p className="text-xs text-text-muted mt-1">Tasks enter the pipeline when moved to build_check</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pipelineTasks.map((task) => {
            const gateStatus = task.gate_status || {}
            const passedCount = Object.values(gateStatus).filter(
              (g) => g.status === 'passed'
            ).length

            return (
              <button
                key={task.id}
                onClick={() => navigate(`/pipeline/${task.id}`)}
                className="w-full text-left rounded-xl border border-border bg-[rgba(22,22,32,0.88)] p-4 hover:border-primary/40 transition-colors animate-card-reveal"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm text-text-primary truncate">{task.title}</h3>
                      <span className="px-1.5 py-0.5 rounded bg-[rgba(184,150,90,0.12)] text-[9px] font-mono uppercase text-primary">
                        {task.project_id || 'olymp'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[10px] font-mono uppercase tracking-[0.2em] ${statusColors[task.status] || 'text-text-muted'}`}>
                        {statusLabels[task.status] || task.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {passedCount}/4 gates
                      </span>
                      {task.assignee && (
                        <span className="text-[10px] font-mono text-text-muted">
                          {task.assignee}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mini gate dots */}
                  <div className="flex items-center gap-1.5 ml-4">
                    {['build_check', 'deploy_check', 'perception_check', 'human_checkpoint'].map((gate) => {
                      const g = gateStatus[gate]
                      return (
                        <div
                          key={gate}
                          className={`w-2.5 h-2.5 rounded-full ${
                            g?.status === 'passed' ? 'bg-success' :
                            g?.status === 'failed' ? 'bg-error' :
                            g?.status === 'running' ? 'bg-info animate-status-pulse' :
                            'bg-border'
                          }`}
                          title={`${gate}: ${g?.status || 'pending'}`}
                        />
                      )
                    })}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
