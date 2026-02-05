import { create } from 'zustand'

export type TaskStatus = 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'
export type AgentStatus = 'active' | 'idle' | 'blocked'
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
  created: string
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

interface OlympusStore {
  stats: OlympusStat[]
  agents: OlympusAgent[]
  tasks: OlympusTask[]
  activities: OlympusActivity[]
  columns: OlympusColumn[]
  isCreateTaskOpen: boolean
  isAgentProfileOpen: boolean
  selectedAgentId: string | null
  openCreateTask: () => void
  closeCreateTask: () => void
  openAgentProfile: (agentId: string) => void
  closeAgentProfile: () => void
  addTask: (task: OlympusTask) => void
  addActivity: (activity: OlympusActivity) => void
  moveTask: (taskId: string, status: TaskStatus) => void
}

const stats: OlympusStat[] = [
  {
    id: 'agents',
    label: 'Active Agents',
    value: 7,
    delta: 4.2,
    trend: [4, 5, 5, 6, 6, 7, 7],
  },
  {
    id: 'tasks',
    label: 'Open Tasks',
    value: 28,
    delta: -2.5,
    trend: [32, 30, 31, 29, 28, 28, 27],
  },
  {
    id: 'velocity',
    label: 'Ops Velocity',
    value: 92,
    unit: '%',
    delta: 6.1,
    trend: [76, 80, 85, 88, 90, 91, 92],
  },
  {
    id: 'latency',
    label: 'Avg Cycle',
    value: 3.4,
    unit: 'h',
    delta: -8.0,
    trend: [4.2, 4.0, 3.8, 3.6, 3.5, 3.4, 3.4],
  },
]

const agents: OlympusAgent[] = [
  {
    id: '1',
    name: 'ARGOS',
    role: 'Orchestrator',
    status: 'active',
    model: 'kimi/k2.5',
    heartbeat: '00:00:08',
    specialization: 'Coordination',
    tasksCompleted: 342,
    reliability: 98,
    efficiency: 95,
    trend: [82, 85, 87, 90, 92, 94, 95],
  },
  {
    id: '2',
    name: 'ATLAS',
    role: 'Frontend Engineer',
    status: 'active',
    model: 'kimi/k2.5',
    heartbeat: '00:00:05',
    specialization: 'UI Systems',
    tasksCompleted: 189,
    reliability: 94,
    efficiency: 92,
    trend: [76, 80, 83, 86, 88, 90, 92],
  },
  {
    id: '3',
    name: 'ATHENA',
    role: 'QA & Strategy',
    status: 'active',
    model: 'kimi/k2.5',
    heartbeat: '00:00:11',
    specialization: 'Risk Control',
    tasksCompleted: 204,
    reliability: 96,
    efficiency: 90,
    trend: [70, 74, 79, 82, 86, 88, 90],
  },
  {
    id: '4',
    name: 'HERCULOS',
    role: 'Backend Engineer',
    status: 'idle',
    model: 'kimi/k2.5',
    heartbeat: '00:02:20',
    specialization: 'APIs',
    tasksCompleted: 140,
    reliability: 88,
    efficiency: 84,
    trend: [60, 65, 69, 71, 76, 80, 84],
  },
  {
    id: '5',
    name: 'PROMETHEUS',
    role: 'DevOps',
    status: 'active',
    model: 'kimi/k2.5',
    heartbeat: '00:00:06',
    specialization: 'Infrastructure',
    tasksCompleted: 171,
    reliability: 92,
    efficiency: 91,
    trend: [68, 72, 78, 82, 86, 89, 91],
  },
  {
    id: '6',
    name: 'APOLLO',
    role: 'Design',
    status: 'blocked',
    model: 'claude-opus-4.5',
    heartbeat: '00:08:12',
    specialization: 'Visual Systems',
    tasksCompleted: 98,
    reliability: 80,
    efficiency: 76,
    trend: [74, 73, 72, 70, 69, 72, 76],
  },
  {
    id: '7',
    name: 'HERMES',
    role: 'Documentation',
    status: 'idle',
    model: 'kimi/k2.5',
    heartbeat: '00:03:45',
    specialization: 'Knowledge Ops',
    tasksCompleted: 131,
    reliability: 90,
    efficiency: 86,
    trend: [64, 67, 70, 73, 78, 82, 86],
  },
]

const tasks: OlympusTask[] = [
  {
    id: 't1',
    title: 'Initialize Olympus design tokens',
    status: 'inbox',
    priority: 'high',
    assignee: null,
    created: '12m ago',
    tags: ['design', 'tokens'],
  },
  {
    id: 't2',
    title: 'Implement DnD task board',
    status: 'in_progress',
    priority: 'critical',
    assignee: 'ATLAS',
    created: '32m ago',
    tags: ['frontend'],
  },
  {
    id: 't3',
    title: 'Telemetry sync audit',
    status: 'review',
    priority: 'normal',
    assignee: 'ATHENA',
    created: '1h ago',
    tags: ['qa'],
  },
  {
    id: 't4',
    title: 'Pipeline stabilization',
    status: 'assigned',
    priority: 'high',
    assignee: 'PROMETHEUS',
    created: '2h ago',
    tags: ['devops'],
  },
  {
    id: 't5',
    title: 'Agent status metrics',
    status: 'done',
    priority: 'normal',
    assignee: 'ARGOS',
    created: '4h ago',
    tags: ['ops'],
  },
  {
    id: 't6',
    title: 'Design assets pending',
    status: 'blocked',
    priority: 'high',
    assignee: 'APOLLO',
    created: '5h ago',
    tags: ['design'],
  },
]

const activities: OlympusActivity[] = [
  {
    id: 'a1',
    type: 'system',
    agent: 'ARGOS',
    title: 'Command mesh synchronized',
    detail: 'All nodes aligned to protocol OLY-015.',
    time: '2 min ago',
  },
  {
    id: 'a2',
    type: 'task',
    agent: 'ATLAS',
    title: 'Kanban drag layer deployed',
    detail: 'Columns now accept live assignment drops.',
    time: '7 min ago',
  },
  {
    id: 'a3',
    type: 'review',
    agent: 'ATHENA',
    title: 'Threat surface review',
    detail: 'No anomalies detected in telemetry flow.',
    time: '18 min ago',
  },
  {
    id: 'a4',
    type: 'heartbeat',
    agent: 'HERCULOS',
    title: 'Heartbeat sync received',
    detail: 'Latency stable at 28ms.',
    time: '32 min ago',
  },
  {
    id: 'a5',
    type: 'alert',
    agent: 'APOLLO',
    title: 'Design asset pipeline blocked',
    detail: 'Awaiting final cinematic assets.',
    time: '1 hour ago',
  },
  {
    id: 'a6',
    type: 'task',
    agent: 'PROMETHEUS',
    title: 'Cloudflare relay verified',
    detail: 'Zero packet loss across 24h window.',
    time: '2 hours ago',
  },
]

const columns: OlympusColumn[] = [
  { id: 'inbox', label: 'Inbox', description: 'Newly forged directives' },
  { id: 'assigned', label: 'Assigned', description: 'Awaiting ignition' },
  { id: 'in_progress', label: 'In Progress', description: 'Active operations' },
  { id: 'review', label: 'Review', description: 'Verification chamber' },
  { id: 'done', label: 'Done', description: 'Completed cycles' },
  { id: 'blocked', label: 'Blocked', description: 'Dependency lock' },
]

export const useOlympusStore = create<OlympusStore>((set) => ({
  stats,
  agents,
  tasks,
  activities,
  columns,
  isCreateTaskOpen: false,
  isAgentProfileOpen: false,
  selectedAgentId: null,
  openCreateTask: () => set({ isCreateTaskOpen: true }),
  closeCreateTask: () => set({ isCreateTaskOpen: false }),
  openAgentProfile: (agentId) =>
    set({ isAgentProfileOpen: true, selectedAgentId: agentId }),
  closeAgentProfile: () =>
    set({ isAgentProfileOpen: false, selectedAgentId: null }),
  moveTask: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    })),
  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),
  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities],
    })),
}))
