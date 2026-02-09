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
  sessionKey?: string
  modelEscalation?: string
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
  fetchStats: () => Promise<void>
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

// Seeded per-agent placeholder stats (until real metrics exist)
const agentPlaceholderStats: Record<string, { reliability: number; efficiency: number; tasksCompleted: number; trend: number[] }> = {
  ARGOS:      { reliability: 98, efficiency: 95, tasksCompleted: 42, trend: [88, 90, 91, 93, 95, 96, 98] },
  ATLAS:      { reliability: 94, efficiency: 91, tasksCompleted: 37, trend: [78, 82, 85, 88, 90, 92, 94] },
  ATHENA:     { reliability: 99, efficiency: 88, tasksCompleted: 51, trend: [90, 92, 94, 95, 97, 98, 99] },
  HERCULOS:   { reliability: 96, efficiency: 93, tasksCompleted: 45, trend: [82, 85, 88, 90, 92, 94, 96] },
  PROMETHEUS: { reliability: 92, efficiency: 97, tasksCompleted: 33, trend: [75, 80, 84, 87, 90, 93, 97] },
  APOLLO:     { reliability: 91, efficiency: 86, tasksCompleted: 28, trend: [70, 74, 78, 82, 85, 88, 91] },
  HERMES:     { reliability: 97, efficiency: 94, tasksCompleted: 56, trend: [85, 88, 90, 92, 94, 95, 97] },
  Claude:     { reliability: 99, efficiency: 96, tasksCompleted: 18, trend: [92, 94, 95, 96, 97, 98, 99] },
}

const defaultStats = { reliability: 90, efficiency: 85, tasksCompleted: 0, trend: [80, 82, 85, 87, 90, 92, 95] }

// Helper to map DB agent to frontend agent
function mapAgent(dbAgent: any, metrics?: any): OlympusAgent {
  const placeholder = agentPlaceholderStats[dbAgent.name] || defaultStats
  const lastActivity = dbAgent.last_activity_at
    ? timeAgo(dbAgent.last_activity_at)
    : 'awaiting'

  return {
    id: dbAgent.id,
    name: dbAgent.name,
    role: dbAgent.role,
    status: dbAgent.status || 'idle',
    model: dbAgent.model_primary?.split('/').pop() || 'Unknown',
    heartbeat: lastActivity,
    specialization: dbAgent.specialization || dbAgent.role || 'General',
    tasksCompleted: metrics?.tasks_completed ?? placeholder.tasksCompleted,
    reliability: metrics?.reliability ?? placeholder.reliability,
    efficiency: metrics?.efficiency ?? placeholder.efficiency,
    trend: placeholder.trend,
    sessionKey: dbAgent.session_key,
    modelEscalation: dbAgent.model_escalation,
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
    { id: 'agents', label: 'Active Agents', value: 0, delta: 0, trend: [] },
    { id: 'tasks', label: 'Open Tasks', value: 0, delta: 0, trend: [] },
    { id: 'velocity', label: 'Ops Velocity', value: 0, unit: '%', delta: 0, trend: [] },
    { id: 'latency', label: 'Avg Cycle', value: 0, unit: 'h', delta: 0, trend: [] },
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

  fetchStats: async () => {
    try {
      // 1. Active Agents: count agents with a configured API endpoint
      const { count: totalAgents } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
      const { count: activeAgents } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .not('api_endpoint', 'is', null)

      // 2. Open Tasks: tasks not in 'done' status
      const { count: openTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'done')
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
      const { count: doneTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')

      // 3. Ops Velocity: % of tasks completed (done / total)
      const total = totalTasks || 0
      const done = doneTasks || 0
      const velocity = total > 0 ? Math.round((done / total) * 100) : 0

      // 4. Avg Cycle: average hours from created_at to updated_at for done tasks
      const { data: doneTData } = await supabase
        .from('tasks')
        .select('created_at, updated_at')
        .eq('status', 'done')
        .limit(100)
      let avgCycle = 0
      if (doneTData && doneTData.length > 0) {
        const totalHours = doneTData.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime()
          const updated = new Date(t.updated_at).getTime()
          return sum + (updated - created) / (1000 * 60 * 60)
        }, 0)
        avgCycle = Math.round((totalHours / doneTData.length) * 10) / 10
      }

      // Build trend data from last 7 days of task counts
      const now = new Date()
      const taskTrend: number[] = []
      const doneTrend: number[] = []
      for (let i = 6; i >= 0; i--) {
        const dayEnd = new Date(now)
        dayEnd.setDate(dayEnd.getDate() - i)
        dayEnd.setHours(23, 59, 59, 999)
        const { count: dayOpen } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'done')
          .lte('created_at', dayEnd.toISOString())
        const { count: dayDone } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'done')
          .lte('created_at', dayEnd.toISOString())
        taskTrend.push(dayOpen || 0)
        doneTrend.push(dayDone || 0)
      }

      // Compute deltas (compare today vs yesterday)
      const prevAgents = activeAgents || 0
      const agentsDelta = (totalAgents || 0) > 0 ? Math.round((prevAgents / (totalAgents || 1)) * 100 - 100) : 0
      const taskDelta = taskTrend.length >= 2 && taskTrend[taskTrend.length - 2] > 0
        ? Math.round(((taskTrend[taskTrend.length - 1] - taskTrend[taskTrend.length - 2]) / taskTrend[taskTrend.length - 2]) * 1000) / 10
        : 0

      set({
        stats: [
          { id: 'agents', label: 'Active Agents', value: activeAgents || 0, delta: agentsDelta, trend: Array(7).fill(activeAgents || 0) },
          { id: 'tasks', label: 'Open Tasks', value: openTasks || 0, delta: taskDelta, trend: taskTrend },
          { id: 'velocity', label: 'Ops Velocity', value: velocity, unit: '%', delta: total > 0 ? Math.round(velocity - 50) : 0, trend: doneTrend.map((d, i) => {
            const t = (taskTrend[i] || 0) + d
            return t > 0 ? Math.round((d / t) * 100) : 0
          }) },
          { id: 'latency', label: 'Avg Cycle', value: avgCycle || 0, unit: 'h', delta: 0, trend: Array(7).fill(avgCycle || 0) },
        ],
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  },

  fetchAgents: async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name')

      if (error) throw error

      // Try to fetch metrics from agent_metrics table
      let metricsMap: Record<string, any> = {}
      const { data: metricsData } = await supabase
        .from('agent_metrics')
        .select('*')
      if (metricsData) {
        for (const m of metricsData) {
          metricsMap[m.agent_id] = m
        }
      }

      // Compute real task-based stats per agent
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('assignee_id, status')
      if (allTasks) {
        const agentTaskMap: Record<string, { total: number; done: number }> = {}
        for (const t of allTasks) {
          if (!t.assignee_id) continue
          if (!agentTaskMap[t.assignee_id]) agentTaskMap[t.assignee_id] = { total: 0, done: 0 }
          agentTaskMap[t.assignee_id].total++
          if (t.status === 'done') agentTaskMap[t.assignee_id].done++
        }
        // Merge into metricsMap
        for (const [agentId, counts] of Object.entries(agentTaskMap)) {
          if (!metricsMap[agentId]) metricsMap[agentId] = {}
          metricsMap[agentId].tasks_completed = counts.done
          metricsMap[agentId].efficiency = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0
        }
      }

      // Count war room messages per agent for reliability proxy
      const { data: msgCounts } = await supabase
        .from('war_room_messages')
        .select('sender_name')
        .eq('sender_type', 'agent')
      if (msgCounts) {
        const msgMap: Record<string, number> = {}
        for (const m of msgCounts) {
          msgMap[m.sender_name] = (msgMap[m.sender_name] || 0) + 1
        }
        for (const agent of (data || [])) {
          const count = msgMap[agent.name] || 0
          if (!metricsMap[agent.id]) metricsMap[agent.id] = {}
          // Reliability: agents with endpoint + messages = more reliable
          metricsMap[agent.id].reliability = agent.api_endpoint
            ? Math.min(99, 70 + Math.min(count, 30))
            : 0
          metricsMap[agent.id].message_count = count
        }
      }

      const mappedAgents = (data || []).map((a: any) => mapAgent(a, metricsMap[a.id]))
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
      const assigneeId = taskData.assignee || null

      const payload = {
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority,
        assignee_id: assigneeId,
        status: assigneeId ? 'assigned' : 'inbox',
        created_by: 'system',
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
