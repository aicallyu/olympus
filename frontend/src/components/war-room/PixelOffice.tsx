import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OfficeAgent } from './OfficeAgent';
import { Coffee, Users, Dumbbell, Monitor, Zap, Brain, Code, Shield, Flame, BookOpen, MessageSquare, Terminal, Building2, Clock, CheckCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'inbox' | 'assigned' | 'in_progress' | 'review' | 'completed';
  assignee_id: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

interface AgentState {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'offline';
  type: 'ai' | 'human';
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  currentTask: Task | null;
  lastTask: Task | null;
  taskStartedAt: string | null;
  lastBreakAt: string | null;
  inMeeting: boolean;
  activity: string;
  breakType: 'coffee' | 'gym' | 'chill' | null;
}

// Department definitions
const DEPARTMENTS: Record<string, { icon: any; color: string; bgColor: string; desc: string }> = {
  'Command': { icon: Zap, color: '#ffd700', bgColor: 'rgba(255, 215, 0, 0.15)', desc: 'Orchestration & Strategy' },
  'Engineering': { icon: Code, color: '#00d9ff', bgColor: 'rgba(0, 217, 255, 0.15)', desc: 'Frontend & Backend' },
  'AI Lab': { icon: Brain, color: '#ff6bff', bgColor: 'rgba(255, 107, 255, 0.15)', desc: 'Architecture & AI' },
  'Creative': { icon: Flame, color: '#ff6b9d', bgColor: 'rgba(255, 107, 157, 0.15)', desc: 'Design & Visual Arts' },
  'Operations': { icon: Shield, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', desc: 'DevOps & QA' },
  'Knowledge': { icon: BookOpen, color: '#b8965a', bgColor: 'rgba(184, 150, 90, 0.15)', desc: 'Docs & Communication' },
};

// Properly spaced desk positions (no overlapping)
const DESKS = [
  { x: 120, y: 200, agent: 'ARGOS', dept: 'Command', zone: 'Command Center', label: 'Hub' },
  { x: 280, y: 200, agent: 'ATLAS', dept: 'Engineering', zone: 'Frontend Squad', label: 'FE Lead' },
  { x: 440, y: 200, agent: 'Claude', dept: 'AI Lab', zone: 'AI Research', label: 'Architect' },
  { x: 120, y: 360, agent: 'ATHENA', dept: 'Operations', zone: 'Quality Assurance', label: 'QA Lead' },
  { x: 280, y: 360, agent: 'HERCULOS', dept: 'Engineering', zone: 'Backend Squad', label: 'BE Lead' },
  { x: 440, y: 360, agent: 'APOLLO', dept: 'Creative', zone: 'Design Studio', label: 'Creative Dir' },
  { x: 120, y: 520, agent: 'PROMETHEUS', dept: 'Operations', zone: 'Infrastructure', label: 'DevOps' },
  { x: 280, y: 520, agent: 'HERMES', dept: 'Knowledge', zone: 'Documentation', label: 'Tech Writer' },
  { x: 680, y: 240, agent: 'Juan', dept: 'Command', zone: 'Executive Suite', label: 'System Arch' },
  { x: 680, y: 400, agent: 'Nathanael', dept: 'Engineering', zone: 'Frontend Squad', label: 'Frontend Dev' },
];

// Room definitions with proper boundaries and occupancy tracking
interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  icon: any;
  color: string;
  purpose: string;
  maxOccupancy: number;
}

const ROOMS: Room[] = [
  { id: 'war-room', x: 850, y: 280, width: 200, height: 140, label: 'War Room', icon: Terminal, color: '#ffd700', purpose: 'Strategy & Multi-Agent Discussions', maxOccupancy: 6 },
  { id: 'kitchen', x: 60, y: 60, width: 180, height: 110, label: 'The Kitchen', icon: Coffee, color: '#ff6b6b', purpose: 'Coffee Breaks & Casual Chat', maxOccupancy: 4 },
  { id: 'gym', x: 820, y: 60, width: 160, height: 110, label: 'Power Gym', icon: Dumbbell, color: '#e94560', purpose: 'Training & Learning', maxOccupancy: 3 },
  { id: 'lounge', x: 400, y: 50, width: 220, height: 110, label: 'Chill Zone', icon: MessageSquare, color: '#4ecdc4', purpose: 'Cooldown & Relaxation', maxOccupancy: 5 },
];

// Get safe position within room boundaries
function getSafeRoomPosition(room: Room, existingAgents: AgentState[], currentAgentId: string): { x: number; y: number } {
  const padding = 30;
  const attempts = 10;
  
  for (let i = 0; i < attempts; i++) {
    const x = room.x + padding + Math.random() * (room.width - 2 * padding);
    const y = room.y + padding + Math.random() * (room.height - 2 * padding);
    
    // Check if too close to other agents
    const tooClose = existingAgents.some(agent => 
      agent.id !== currentAgentId &&
      agent.targetPosition &&
      Math.abs(agent.targetPosition.x - x) < 25 &&
      Math.abs(agent.targetPosition.y - y) < 25
    );
    
    if (!tooClose) return { x, y };
  }
  
  // Fallback: return center
  return { 
    x: room.x + room.width / 2, 
    y: room.y + room.height / 2 
  };
}

export function PixelOffice() {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const animationRef = useRef<number>();

  // Fetch agents and tasks
  useEffect(() => {
    const fetchData = async () => {
      const [{ data: agentsData }, { data: tasksData }] = await Promise.all([
        supabase.from('agents').select('id, name, role, status, type, current_task_id').order('name'),
        supabase.from('tasks').select('*').order('updated_at', { ascending: false }),
      ]);

      if (agentsData && tasksData) {
        setTasks(tasksData);
        
        const agentsWithState: AgentState[] = agentsData.map((agent: any) => {
          const desk = DESKS.find(d => d.agent === agent.name);
          const currentTask = tasksData.find((t: Task) => t.id === agent.current_task_id) || null;
          const lastCompletedTask = tasksData.find((t: Task) => 
            t.status === 'completed' && t.assignee_id === agent.id
          ) || null;
          
          return {
            id: agent.id,
            name: agent.name,
            role: agent.role,
            status: agent.status,
            type: agent.type,
            position: desk ? { x: desk.x, y: desk.y } : { x: 400, y: 300 },
            targetPosition: null,
            currentTask,
            lastTask: lastCompletedTask,
            taskStartedAt: currentTask ? currentTask.created_at : null,
            lastBreakAt: null,
            inMeeting: false,
            activity: currentTask ? `Working: ${currentTask.title}` : 'Idle',
            breakType: null,
          };
        });
        
        setAgents(agentsWithState);
      }
    };

    fetchData();

    // Subscribe to agent changes
    const agentSub = supabase
      .channel('agent-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' },
        (payload: { new: any }) => {
          setAgents(prev => prev.map(agent => {
            if (agent.id === payload.new.id) {
              const updated = { ...agent, status: payload.new.status };
              
              // Status changed to working - go to desk
              if (payload.new.status === 'working') {
                const desk = DESKS.find(d => d.agent === agent.name);
                if (desk) {
                  updated.targetPosition = { x: desk.x, y: desk.y };
                  updated.activity = `Working${agent.currentTask ? `: ${agent.currentTask.title}` : ''}`;
                  updated.breakType = null;
                }
              }
              
              // Status changed to idle - take a break
              if (payload.new.status === 'idle' && agent.status === 'working') {
                const breakType = Math.random() < 0.33 ? 'coffee' : Math.random() < 0.5 ? 'chill' : 'gym';
                updated.breakType = breakType;
                updated.lastBreakAt = new Date().toISOString();
                
                let targetRoom: Room | undefined;
                if (breakType === 'coffee') targetRoom = ROOMS.find(r => r.id === 'kitchen');
                else if (breakType === 'chill') targetRoom = ROOMS.find(r => r.id === 'lounge');
                else if (breakType === 'gym') targetRoom = ROOMS.find(r => r.id === 'gym');
                
                if (targetRoom) {
                  updated.targetPosition = getSafeRoomPosition(targetRoom, prev, agent.id);
                  updated.activity = breakType === 'gym' ? 'Training session' : `Taking a break${agent.lastTask ? ` after: ${agent.lastTask.title}` : ''}`;
                }
              }
              
              return updated;
            }
            return agent;
          }));
        }
      )
      .subscribe();

    // Subscribe to task changes
    const taskSub = supabase
      .channel('task-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },
        () => {
          // Refresh tasks
          supabase.from('tasks').select('*').then(({ data }) => {
            if (data) setTasks(data);
          });
        }
      )
      .subscribe();

    return () => {
      agentSub.unsubscribe();
      taskSub.unsubscribe();
    };
  }, []);

  // Smart movement animation
  useEffect(() => {
    const animate = () => {
      setAgents(prev => prev.map(agent => {
        // If at target, clear it
        if (agent.targetPosition) {
          const dx = agent.targetPosition.x - agent.position.x;
          const dy = agent.targetPosition.y - agent.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 2) {
            return { ...agent, targetPosition: null, position: agent.targetPosition };
          }

          // Move towards target (slower for idle agents)
          const speed = agent.status === 'working' ? 2.5 : 1.2;
          return {
            ...agent,
            position: {
              x: agent.position.x + (dx / distance) * speed,
              y: agent.position.y + (dy / distance) * speed,
            },
          };
        }

        // Idle agents: rare, purposeful movement only
        if (agent.status === 'idle' && !agent.targetPosition && agent.breakType) {
          // Return to desk after break duration (30 seconds)
          if (agent.lastBreakAt) {
            const breakDuration = Date.now() - new Date(agent.lastBreakAt).getTime();
            if (breakDuration > 30000) {
              const desk = DESKS.find(d => d.agent === agent.name);
              if (desk) {
                return {
                  ...agent,
                  targetPosition: { x: desk.x, y: desk.y },
                  activity: 'Returning to desk',
                  breakType: null,
                };
              }
            }
          }
        }

        return agent;
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Calculate room occupancy
  const getRoomOccupants = (roomId: string) => {
    const room = ROOMS.find(r => r.id === roomId);
    if (!room) return [];
    
    return agents.filter(agent => {
      if (!agent.targetPosition) {
        // Check if agent is inside room bounds
        return (
          agent.position.x >= room.x &&
          agent.position.x <= room.x + room.width &&
          agent.position.y >= room.y &&
          agent.position.y <= room.y + room.height
        );
      }
      // Check if agent is heading to this room
      return (
        agent.targetPosition.x >= room.x &&
        agent.targetPosition.x <= room.x + room.width &&
        agent.targetPosition.y >= room.y &&
        agent.targetPosition.y <= room.y + room.height
      );
    });
  };

  // Format time duration
  const formatDuration = (startTime: string | null) => {
    if (!startTime) return '';
    const diff = Date.now() - new Date(startTime).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just started';
    if (minutes === 1) return '1 min';
    return `${minutes} mins`;
  };

  // Calculate task progress
  const getTaskProgress = (agent: AgentState) => {
    if (!agent.currentTask) return 0;
    if (!agent.taskStartedAt) return 0;
    
    const elapsed = Date.now() - new Date(agent.taskStartedAt).getTime();
    const estimatedDuration = 5 * 60 * 1000; // Estimate 5 minutes per task
    return Math.min(95, Math.round((elapsed / estimatedDuration) * 100));
  };

  const workingCount = agents.filter(a => a.status === 'working').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0a0a12] via-[#0f0f1a] to-[#141426] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `linear-gradient(rgba(0, 217, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.05) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Header Stats */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <div className="flex gap-3">
          <div className="bg-[#0f0f1a]/95 backdrop-blur-xl border border-[#e94560]/40 rounded-2xl px-5 py-2.5 shadow-lg shadow-[#e94560]/20">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#e94560]" />
              <span className="text-[#eaeaea] text-sm font-mono font-bold">{workingCount} Working</span>
            </div>
          </div>
          <div className="bg-[#0f0f1a]/95 backdrop-blur-xl border border-[#ffd700]/40 rounded-2xl px-5 py-2.5 shadow-lg shadow-[#ffd700]/20">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-[#ffd700]" />
              <span className="text-[#eaeaea] text-sm font-mono font-bold">{idleCount} On Break</span>
            </div>
          </div>
          <div className="bg-[#0f0f1a]/95 backdrop-blur-xl border border-[#00d9ff]/40 rounded-2xl px-5 py-2.5 shadow-lg shadow-[#00d9ff]/20">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00d9ff]" />
              <span className="text-[#eaeaea] text-sm font-mono font-bold">{agents.length} Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Department Labels */}
      <div className="absolute left-6 top-24 flex flex-col gap-8">
        <div className="flex items-center gap-2 opacity-60">
          <Building2 className="w-4 h-4 text-[#ffd700]" />
          <span className="text-[10px] font-mono text-[#ffd700] uppercase tracking-widest">Command Deck</span>
        </div>
        <div className="flex items-center gap-2 opacity-60">
          <Code className="w-4 h-4 text-[#00d9ff]" />
          <span className="text-[10px] font-mono text-[#00d9ff] uppercase tracking-widest">Engineering Wing</span>
        </div>
        <div className="flex items-center gap-2 opacity-60">
          <Brain className="w-4 h-4 text-[#ff6bff]" />
          <span className="text-[10px] font-mono text-[#ff6bff] uppercase tracking-widest">AI Research Lab</span>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="relative w-full h-full pt-16">
        {/* Rooms with hover tooltips */}
        {ROOMS.map((room) => {
          const Icon = room.icon;
          const occupants = getRoomOccupants(room.id);
          const isHovered = hoveredRoom === room.id;
          
          return (
            <div
              key={room.id}
              className="absolute rounded-2xl border-2 transition-all duration-300 cursor-pointer"
              style={{
                left: room.x,
                top: room.y,
                width: room.width,
                height: room.height,
                borderColor: isHovered ? room.color : `${room.color}40`,
                backgroundColor: isHovered ? `${room.color}20` : `${room.color}08`,
                boxShadow: isHovered ? `0 0 30px ${room.color}30` : 'none',
              }}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              {/* Room Header */}
              <div className="absolute -top-7 left-4 flex items-center gap-2 bg-[#0f0f1a] px-3 py-1.5 rounded-full border"
                style={{ borderColor: `${room.color}40` }}
              >
                <Icon className="w-4 h-4" style={{ color: room.color }} />
                <span className="text-xs font-mono font-bold" style={{ color: room.color }}>{room.label}</span>
              </div>

              {/* Occupancy Counter */}
              {occupants.length > 0 && (
                <div className="absolute top-2 right-2 bg-[#0f0f1a]/80 rounded-full px-2 py-0.5">
                  <span className="text-[10px] font-mono text-[#eaeaea]">{occupants.length}/{room.maxOccupancy}</span>
                </div>
              )}

              {/* Room Tooltip */}
              {isHovered && (
                <div className="absolute z-50 bg-[#0f0f1a]/98 backdrop-blur-xl border rounded-xl p-3 shadow-2xl"
                  style={{ 
                    borderColor: `${room.color}40`,
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    minWidth: '220px',
                  }}
                >
                  <p className="text-xs font-mono font-bold mb-1" style={{ color: room.color }}>{room.label}</p>
                  <p className="text-[10px] text-[#7a7aaa] font-mono mb-2">{room.purpose}</p>
                  
                  {occupants.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-[#7a7aaa] font-mono uppercase tracking-wider">Occupants:</p>
                      {occupants.map((occupant) => (
                        <div key={occupant.id} className="flex items-start gap-2 text-[10px]">
                          <span className="text-[#eaeaea] font-mono font-bold">{occupant.name}</span>
                          <span className="text-[#7a7aaa] font-mono">—</span>
                          <span className="text-[#4a7c59] font-mono italic">{occupant.activity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#7a7aaa] font-mono italic">Empty</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Desks with Agent Tooltips */}
        {DESKS.map((desk) => {
          const dept = DEPARTMENTS[desk.dept];
          const Icon = dept.icon;
          const agent = agents.find(a => a.name === desk.agent);
          const isHovered = hoveredAgent === desk.agent;
          
          return (
            <div
              key={desk.agent}
              className="absolute group"
              style={{ left: desk.x - 50, top: desk.y - 35 }}
              onMouseEnter={() => setHoveredAgent(desk.agent)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              {/* Desk */}
              <div 
                className="w-28 h-24 rounded-xl border-2 transition-all duration-300 relative overflow-hidden"
                style={{
                  borderColor: isHovered ? dept.color : `${dept.color}50`,
                  backgroundColor: isHovered ? dept.bgColor : 'rgba(15, 15, 26, 0.95)',
                  boxShadow: isHovered ? `0 0 25px ${dept.color}50` : 'none',
                }}
              >
                {/* Desk Header */}
                <div className="h-6 flex items-center justify-center border-b"
                  style={{ borderColor: `${dept.color}30`, backgroundColor: `${dept.color}15` }}
                >
                  <Icon className="w-3 h-3 mr-1" style={{ color: dept.color }} />
                  <span className="text-[7px] text-[#eaeaea] font-mono uppercase tracking-wider truncate px-1">
                    {desk.zone}
                  </span>
                </div>

                {/* Monitor */}
                <div className="p-2 flex flex-col items-center justify-center h-[calc(100%-24px)]">
                  <div className="w-14 h-9 rounded border-2 relative overflow-hidden mb-1"
                    style={{ borderColor: dept.color }}
                  >
                    <div className="absolute inset-0 bg-[#0a0a0f]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {agent?.status === 'working' ? (
                        <div className="w-10 h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                          <div className="h-full bg-[#e94560] rounded-full animate-pulse"
                            style={{ width: `${getTaskProgress(agent)}%` }}
                          />
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: dept.color }} />
                      )}
                    </div>
                  </div>
                  <span className="text-[8px] text-[#7a7aaa] font-mono">{desk.agent}</span>
                </div>

                {/* Role Badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[6px] font-mono uppercase whitespace-nowrap"
                  style={{ backgroundColor: dept.color, color: '#0f0f1a' }}
                >
                  {desk.label}
                </div>
              </div>

              {/* Agent Tooltip */}
              {isHovered && agent && (
                <div className="absolute z-50 bg-[#0f0f1a]/98 backdrop-blur-xl border border-[#7a7aaa]/30 rounded-xl p-3 shadow-2xl"
                  style={{ 
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '12px',
                    minWidth: '240px',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      agent.status === 'working' ? 'bg-[#e94560] animate-pulse' :
                      agent.status === 'idle' ? 'bg-[#ffd700]' : 'bg-[#666]'
                    }`} />
                    <span className="text-sm text-[#eaeaea] font-mono font-bold">{agent.name}</span>
                    <span className="text-[10px] text-[#7a7aaa] font-mono">({agent.role})</span>
                  </div>

                  {/* Current Task */}
                  {agent.currentTask ? (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3 text-[#00d9ff]" />
                        <span className="text-[10px] text-[#7a7aaa] font-mono uppercase">Current Task</span>
                        <span className="text-[9px] text-[#4a7c59] font-mono">({formatDuration(agent.taskStartedAt)})</span>
                      </div>
                      <p className="text-xs text-[#eaeaea] font-mono mb-1.5">{agent.currentTask.title}</p>
                      <div className="w-full h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#e94560] to-[#ff6b9d] rounded-full"
                          style={{ width: `${getTaskProgress(agent)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-[#7a7aaa] font-mono mt-1">{getTaskProgress(agent)}% complete</p>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5">
                        <Coffee className="w-3 h-3 text-[#ffd700]" />
                        <span className="text-[10px] text-[#7a7aaa] font-mono uppercase">Status</span>
                      </div>
                      <p className="text-xs text-[#eaeaea] font-mono mt-1">{agent.activity}</p>
                    </div>
                  )}

                  {/* Last Completed Task */}
                  {agent.lastTask && (
                    <div className="pt-2 border-t border-[#7a7aaa]/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle className="w-3 h-3 text-[#22c55e]" />
                        <span className="text-[10px] text-[#7a7aaa] font-mono uppercase">Last Completed</span>
                      </div>
                      <p className="text-[10px] text-[#4a7c59] font-mono">{agent.lastTask.title}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Agents */}
        {agents.map((agent) => (
          <OfficeAgent
            key={agent.id}
            agent={agent}
            onClick={() => setSelectedAgent(agent)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[#0f0f1a]/95 backdrop-blur-xl border border-[#7a7aaa]/30 rounded-xl p-4 z-20">
        <p className="text-[10px] text-[#7a7aaa] font-mono uppercase mb-3 tracking-wider">Agent Status</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e94560] animate-pulse shadow-lg shadow-[#e94560]/50" />
            <span className="text-xs text-[#eaeaea] font-mono">Working at desk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffd700] shadow-lg shadow-[#ffd700]/50" />
            <span className="text-xs text-[#eaeaea] font-mono">On break</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#666]" />
            <span className="text-xs text-[#eaeaea] font-mono">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
