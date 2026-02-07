import { create } from 'zustand'

export type TaskStatus =
  | 'inbox' | 'assigned' | 'in_progress'
  | 'build_check' | 'deploy_check' | 'perception_check' | 'human_checkpoint'
  | 'done' | 'auto_fix' | 'escalated' | 'rejected'
  | 'review' | 'blocked'

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

export type TaskType = 'frontend' | 'backend' | 'deployment'

export interface AcceptanceCriterion {
  id: string
  criterion: string
  type: 'browser_test' | 'build_check' | 'code_check'
  test_selector?: string
  test_action?: string
  expected_result?: string
  verified: boolean
  verified_by: string | null
  verified_at: string | null
  evidence_url: string | null
}

export interface GateStatus {
  status: 'pending' | 'running' | 'passed' | 'failed'
  attempts: number
  max_attempts: number
  last_error: string | null
  passed_at: string | null
}
export type AgentStatus = 'idle' | 'active' | 'blocked'
export type ActivityType = 'task' | 'system' | 'alert' | 'heartbeat' | 'review'

export interface OlympusStat {
  id: string
  label: string
  value: number
  unit?: string
  delta: number
  trend: number[]
}

export interface OlympusAgent {
  id: string
  name: string
  role: string
  status: AgentStatus
  model: string
  heartbeat: string
  specialization: string
  tasksCompleted: number
  reliability: number
  efficiency: number
  trend: number[]
}

export interface OlympusTask {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string | null
  assignee_id?: string | null
  created: string
  created_at?: string
  tags: string[]
  project_id?: string
  acceptance_criteria?: AcceptanceCriterion[]
  gate_status?: Record<string, GateStatus>
}

export interface OlympusActivity {
  id: string
  type: ActivityType
  agent: string
  title: string
  detail: string
  time: string
}

export interface OlympusColumn {
  id: TaskStatus
  label: string
  description: string
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface ProjectConfig {
  repo: string
  stack: {
    framework: string
    build_command: string
    typecheck_command: string
    lint_command: string
    node_version: string
  }
  deployment: {
    platform: string
    live_url: string
    env_vars_required: string[]
    deploy_branch: string
  }
  agents: Record<string, string>
  notifications?: {
    escalation_channel?: string
    escalation_contact?: string
  }
}

export interface Project {
  id: string
  name: string
  config: ProjectConfig
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TaskVerification {
  id: string
  task_id: string
  project_id: string
  gate: string
  attempt_number: number
  verified_by: string
  status: 'pass' | 'fail' | 'auto_fix_attempted' | 'escalated'
  summary: string
  details: Record<string, unknown>
  criteria_results: unknown[]
  auto_fix_action: string | null
  auto_fix_result: string | null
  escalation_context: string | null
  created_at: string
}

interface OlympusStore {
  stats: OlympusStat[]
  agents: OlympusAgent[]
  tasks: OlympusTask[]
  activities: OlympusActivity[]
  columns: OlympusColumn[]
  isCreateTaskOpen: boolean
  isAgentProfileOpen: boolean
  selectedAgentId: string | null
  toasts: Toast[]
  isLoading: boolean

  // Project state
  projects: Project[]
  selectedProjectId: string

  // Actions
  openCreateTask: () => void
  closeCreateTask: () => void
  openAgentProfile: (agentId: string) => void
  closeAgentProfile: () => void

  // API Actions
  fetchTasks: () => Promise<void>
  fetchAgents: () => Promise<void>
  fetchProjects: () => Promise<void>
  fetchVerifications: (taskId: string) => Promise<TaskVerification[]>
  approveTask: (taskId: string, notes?: string) => Promise<boolean>
  rejectTask: (taskId: string, notes?: string) => Promise<boolean>
  createTask: (task: { title: string; description?: string; priority: TaskPriority; assignee?: string; acceptance_criteria?: AcceptanceCriterion[] }) => Promise<boolean>
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<boolean>
  assignTask: (taskId: string, agentId: string) => Promise<boolean>
  moveTask: (taskId: string, status: TaskStatus) => void
  addTask: (task: OlympusTask) => void
  addActivity: (activity: OlympusActivity) => void
  setSelectedProject: (projectId: string) => void

  // Toast
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  removeToast: (id: string) => void
}

const columns: OlympusColumn[] = [
  { id: 'inbox', label: 'Inbox', description: 'Newly forged directives' },
  { id: 'assigned', label: 'Assigned', description: 'Awaiting ignition' },
  { id: 'in_progress', label: 'In Progress', description: 'Active operations' },
  { id: 'review', label: 'Review', description: 'Verification chamber' },
  { id: 'done', label: 'Done', description: 'Completed cycles' },
  { id: 'blocked', label: 'Blocked', description: 'Dependency lock' },
]

// Helper to format time ago
function timeAgo(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Helper to map DB agent to frontend agent
function mapAgent(dbAgent: any): OlympusAgent {
  return {
    id: dbAgent.id,
    name: dbAgent.name,
    role: dbAgent.role,
    status: dbAgent.status,
    model: dbAgent.model_primary?.split('/').pop() || 'Unknown',
    heartbeat: '00:00:00',
    specialization: dbAgent.specialization || 'General',
    tasksCompleted: 0,
    reliability: 95,
    efficiency: 90,
    trend: [80, 82, 85, 87, 90, 92, 95],
  }
}

// Helper to map DB task to frontend task
function mapTask(dbTask: any, agents: OlympusAgent[]): OlympusTask {
  const assignee = dbTask.assignee_id 
    ? agents.find(a => a.id === dbTask.assignee_id)?.name || null
    : null
    
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    status: dbTask.status,
    priority: dbTask.priority,
    assignee,
    assignee_id: dbTask.assignee_id,
    created: timeAgo(dbTask.created_at),
    created_at: dbTask.created_at,
    tags: dbTask.tags || [],
    project_id: dbTask.project_id,
    acceptance_criteria: dbTask.acceptance_criteria || [],
    gate_status: dbTask.gate_status,
  }
}

export const useOlympusStore = create<OlympusStore>((set, get) => ({
  stats: [
    { id: 'agents', label: 'Active Agents', value: 7, delta: 4.2, trend: [4, 5, 5, 6, 6, 7, 7] },
    { id: 'tasks', label: 'Open Tasks', value: 28, delta: -2.5, trend: [32, 30, 31, 29, 28, 28, 27] },
    { id: 'velocity', label: 'Ops Velocity', value: 92, unit: '%', delta: 6.1, trend: [76, 80, 85, 88, 90, 91, 92] },
    { id: 'latency', label: 'Avg Cycle', value: 3.4, unit: 'h', delta: -8.0, trend: [4.2, 4.0, 3.8, 3.6, 3.5, 3.4, 3.4] },
  ],
  agents: [],
  tasks: [],
  activities: [],
  columns,
  isCreateTaskOpen: false,
  isAgentProfileOpen: false,
  selectedAgentId: null,
  toasts: [],
  isLoading: false,

  projects: [],
  selectedProjectId: 'olymp',

  openCreateTask: () => set({ isCreateTaskOpen: true }),
  closeCreateTask: () => set({ isCreateTaskOpen: false }),
  openAgentProfile: (agentId) => set({ isAgentProfileOpen: true, selectedAgentId: agentId }),
  closeAgentProfile: () => set({ isAgentProfileOpen: false, selectedAgentId: null }),

  showToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(7)
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 3000)
  },
  
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  fetchAgents: async () => {
    try {
      const response = await fetch('/api/agents')
      if (!response.ok) throw new Error('Failed to fetch agents')
      const data = await response.json()
      const mappedAgents = (data.agents || []).map(mapAgent)
      set({ agents: mappedAgents })
    } catch (error) {
      console.error('Error fetching agents:', error)
      get().showToast('Failed to fetch agents', 'error')
    }
  },

  fetchTasks: async () => {
    try {
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      const { agents } = get()
      const mappedTasks = (data.tasks || []).map((t: any) => mapTask(t, agents))
      set({ tasks: mappedTasks })
    } catch (error) {
      console.error('Error fetching tasks:', error)
      get().showToast('Failed to fetch tasks', 'error')
    }
  },

  fetchProjects: async () => {
    try {
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error('Failed to fetch projects')
      const data = await response.json()
      set({ projects: data.projects || [] })
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  },

  setSelectedProject: (projectId) => {
    set({ selectedProjectId: projectId })
  },

  fetchVerifications: async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/verifications`)
      if (!response.ok) throw new Error('Failed to fetch verifications')
      const data = await response.json()
      return data.verifications || []
    } catch (error) {
      console.error('Error fetching verifications:', error)
      return []
    }
  },

  approveTask: async (taskId, notes) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || '' }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to approve task')
      }

      const data = await response.json()
      const { agents } = get()
      const updatedTask = mapTask(data.task, agents)

      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
      }))

      get().showToast('Task approved and marked done', 'success')
      return true
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to approve task'
      console.error('Error approving task:', error)
      get().showToast(message, 'error')
      return false
    }
  },

  rejectTask: async (taskId, notes) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || '' }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to reject task')
      }

      const data = await response.json()
      const { agents } = get()
      const updatedTask = mapTask(data.task, agents)

      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
      }))

      get().showToast('Task rejected — sent back to agent', 'info')
      return true
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reject task'
      console.error('Error rejecting task:', error)
      get().showToast(message, 'error')
      return false
    }
  },

  createTask: async (taskData) => {
    set({ isLoading: true })
    try {
      const payload = {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        assignee: taskData.assignee === 'Unassigned' ? null : taskData.assignee,
        status: taskData.assignee && taskData.assignee !== 'Unassigned' ? 'assigned' : 'inbox',
        created_by: 'ARGOS',
        acceptance_criteria: taskData.acceptance_criteria || [],
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      const data = await response.json()
      const { agents } = get()
      const newTask = mapTask(data.task, agents)
      
      set((state) => ({ tasks: [newTask, ...state.tasks] }))
      get().showToast('Task created successfully', 'success')
      return true
    } catch (error) {
      console.error('Error creating task:', error)
      get().showToast('Failed to create task', 'error')
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  updateTaskStatus: async (taskId, status) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to update status')
      }

      const data = await response.json()
      const { agents } = get()
      const updatedTask = mapTask(data.task, agents)
      
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
      }))
      
      get().showToast(`Status updated to ${status.replace('_', ' ')}`, 'success')
      return true
    } catch (error: any) {
      console.error('Error updating task status:', error)
      get().showToast(error.message || 'Failed to update status', 'error')
      return false
    }
  },

  assignTask: async (taskId, agentId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to assign task')
      }

      const data = await response.json()
      const { agents } = get()
      const updatedTask = mapTask(data.task, agents)
      
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
      }))
      
      const agentName = agents.find(a => a.id === agentId)?.name || 'Agent'
      get().showToast(`Task assigned to ${agentName}`, 'success')
      return true
    } catch (error: any) {
      console.error('Error assigning task:', error)
      get().showToast(error.message || 'Failed to assign task', 'error')
      return false
    }
  },

  moveTask: (taskId, status) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, status } : task
      ),
    }))
  },

  addTask: (task) => {
    set((state) => ({ tasks: [task, ...state.tasks] }))
  },

  addActivity: (activity) => {
    set((state) => ({ activities: [activity, ...state.activities] }))
  },
}))
