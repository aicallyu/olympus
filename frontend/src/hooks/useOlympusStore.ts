import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type TaskStatus = 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'
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
  
  // Actions
  openCreateTask: () => void
  closeCreateTask: () => void
  openAgentProfile: (agentId: string) => void
  closeAgentProfile: () => void
  
  // API Actions
  fetchTasks: () => Promise<void>
  fetchAgents: () => Promise<void>
  createTask: (task: { title: string; description?: string; priority: TaskPriority; assignee?: string }) => Promise<boolean>
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<boolean>
  assignTask: (taskId: string, agentId: string) => Promise<boolean>
  moveTask: (taskId: string, status: TaskStatus) => void
  addTask: (task: OlympusTask) => void
  addActivity: (activity: OlympusActivity) => void
  
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
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      const mappedAgents = (data || []).map(mapAgent)
      set({ agents: mappedAgents })
    } catch (error) {
      console.error('Error fetching agents:', error)
      get().showToast('Failed to fetch agents', 'error')
    }
  },

  fetchTasks: async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const { agents } = get()
      const mappedTasks = (data || []).map((t: any) => mapTask(t, agents))
      set({ tasks: mappedTasks })
    } catch (error) {
      console.error('Error fetching tasks:', error)
      get().showToast('Failed to fetch tasks', 'error')
    }
  },

  createTask: async (taskData) => {
    set({ isLoading: true })
    try {
      const payload = {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        assignee_id: taskData.assignee === 'Unassigned' ? null : taskData.assignee,
        status: taskData.assignee && taskData.assignee !== 'Unassigned' ? 'assigned' : 'inbox',
        created_by: 'ARGOS',
        created_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      const { agents } = get()
      const newTask = mapTask(data, agents)
      
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
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)

      if (error) throw error

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status } : t
        ),
      }))
      get().showToast('Task status updated', 'success')
      return true
    } catch (error) {
      console.error('Error updating task status:', error)
      get().showToast('Failed to update task', 'error')
      return false
    }
  },

  assignTask: async (taskId, agentId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: agentId, status: 'assigned' })
        .eq('id', taskId)

      if (error) throw error

      const { agents } = get()
      const assignee = agents.find((a) => a.id === agentId)?.name || null

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, assignee_id: agentId, assignee, status: 'assigned' } : t
        ),
      }))
      get().showToast('Task assigned successfully', 'success')
      return true
    } catch (error) {
      console.error('Error assigning task:', error)
      get().showToast('Failed to assign task', 'error')
      return false
    }
  },

  moveTask: (taskId, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status } : t
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
