import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OfficeAgent } from './OfficeAgent';
import { 
  Coffee, Users, Dumbbell, Monitor, Zap, Brain, Code, Shield, 
  Flame, BookOpen, MessageSquare, Terminal, Building2, Clock, CheckCircle 
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  estimated_duration: number | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'offline';
  current_task_id: string | null;
  type: 'ai' | 'human';
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  currentTask: Task | null;
  lastTask: Task | null;
  lastTaskCompletedAt: string | null;
  activity: string;
  state: 'working' | 'break' | 'training' | 'meeting' | 'idle';
  timeInState: number;
}

const DEPARTMENTS: Record<string, { icon: any; color: string; bgColor: string; desc: string }> = {
  'Command': { icon: Zap, color: '#ffd700', bgColor: 'rgba(255, 215, 0, 0.1)', desc: 'Orchestration & Strategy' },
  'Engineering': { icon: Code, color: '#00d9ff', bgColor: 'rgba(0, 217, 255, 0.1)', desc: 'Frontend & Backend' },
  'AI Lab': { icon: Brain, color: '#ff6bff', bgColor: 'rgba(255, 107, 255, 0.1)', desc: 'Architecture & AI' },
  'Creative': { icon: Flame, color: '#ff6b9d', bgColor: 'rgba(255, 107, 157, 0.1)', desc: 'Design & Visual Arts' },
  'Operations': { icon: Shield, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', desc: 'DevOps & QA' },
  'Knowledge': { icon: BookOpen, color: '#b8965a', bgColor: 'rgba(184, 150, 90, 0.1)', desc: 'Docs & Communication' },
};

const DESKS = [
  { x: 150, y: 220, agent: 'ARGOS', dept: 'Command', zone: 'Command Center', label: 'Hub' },
  { x: 350, y: 220, agent: 'ATLAS', dept: 'Engineering', zone: 'Frontend Squad', label: 'FE Lead' },
  { x: 550, y: 220, agent: 'Claude', dept: 'AI Lab', zone: 'AI Research', label: 'Architect' },
  { x: 150, y: 380, agent: 'ATHENA', dept: 'Operations', zone: 'Quality Assurance', label: 'QA Lead' },
  { x: 350, y: 380, agent: 'HERCULOS', dept: 'Engineering', zone: 'Backend Squad', label: 'BE Lead' },
  { x: 550, y: 380, agent: 'APOLLO', dept: 'Creative', zone: 'Design Studio', label: 'Creative Dir' },
  { x: 150, y: 540, agent: 'PROMETHEUS', dept: 'Operations', zone: 'Infrastructure', label: 'DevOps' },
  { x: 350, y: 540, agent: 'HERMES', dept: 'Knowledge', zone: 'Documentation', label: 'Tech Writer' },
  { x: 850, y: 300, agent: 'Juan', dept: 'Command', zone: 'Executive Suite', label: 'System Arch' },
  { x: 850, y: 450, agent: 'Nathanael', dept: 'Engineering', zone: 'Frontend Squad', label: 'Frontend Dev' },
];

const ROOMS = {
  conference: { 
    x: 1050, y: 320, width: 200, height: 140, 
    label: 'War Room', icon: Terminal,
    entryPoints: [{ x: 1020, y: 390 }],
    capacity: 8
  },
  kitchen: { 
    x: 80, y: 80, width: 180, height: 120, 
    label: 'The Kitchen', icon: Coffee,
    entryPoints: [{ x: 200, y: 170 }],
    capacity: 4
  },
  gym: { 
    x: 900, y: 80, width: 160, height: 120, 
    label: 'Power Gym', icon: Dumbbell,
    entryPoints: [{ x: 980, y: 170 }],
    capacity: 3
  },
  lounge: { 
    x: 450, y: 60, width: 220, height: 120, 
    label: 'Chill Zone', icon: MessageSquare,
    entryPoints: [{ x: 560, y: 150 }],
    capacity: 6
  },
};

// Get a position inside a room that's not occupied
function getPositionInRoom(room: typeof ROOMS[keyof typeof ROOMS], occupiedPositions: {x:number,y:number}[]): {x:number,y:number} {
  const padding = 30;
  let attempts = 0;
  let pos;
  
  do {
    pos = {
      x: room.x + padding + Math.random() * (room.width - padding * 2),
      y: room.y + padding + Math.random() * (room.height - padding * 2)
    };
    attempts++;
  } while (attempts < 10 && occupiedPositions.some(p => 
    Math.abs(p.x - pos.x) < 20 && Math.abs(p.y - pos.y) < 20
  ));
  
  return pos;
}

export function PixelOffice() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Fetch agents with their tasks
  useEffect(() => {
    const fetchData = async () => {
      // Fetch agents
      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, name, role, status, current_task_id, type, last_completed_task_id, last_task_completed_at')
        .order('name');

      if (!agentsData) return;

      // Fetch current tasks
      const currentTaskIds = agentsData.map(a => a.current_task_id).filter(Boolean);
      const { data: currentTasks } = currentTaskIds.length > 0 
        ? await supabase.from('tasks').select('*').in('id', currentTaskIds)
        : { data: [] };

      // Fetch last completed tasks
      const lastTaskIds = agentsData.map(a => a.last_completed_task_id).filter(Boolean);
      const { data: lastTasks } = lastTaskIds.length > 0
        ? await supabase.from('tasks').select('*').in('id', lastTaskIds)
        : { data: [] };

      const currentTasksMap = new Map(currentTasks?.map(t => [t.id, t]) || []);
      const lastTasksMap = new Map(lastTasks?.map(t => [t.id, t]) || []);

      const agentsWithData: Agent[] = agentsData.map((agent: any) => {
        const desk = DESKS.find(d => d.agent === agent.name);
        const currentTask = agent.current_task_id ? currentTasksMap.get(agent.current_task_id) : null;
        const lastTask = agent.last_completed_task_id ? lastTasksMap.get(agent.last_completed_task_id) : null;
        
        const isWorking = agent.status === 'working' && currentTask;
        const justFinished = lastTask && agent.last_task_completed_at && 
          (Date.now() - new Date(agent.last_task_completed_at).getTime()) < 5 * 60 * 1000;

        let state: Agent['state'] = 'idle';
        let activity = 'Idle';

        if (isWorking) {
          state = 'working';
          activity = `Working: ${currentTask.title}`;
        } else if (justFinished) {
          state = 'break';
          activity = `Cooldown after: ${lastTask.title}`;
        }

        return {
          ...agent,
          position: desk ? { x: desk.x, y: desk.y } : { x: 400, y: 300 },
          targetPosition: null,
          currentTask,
          lastTask,
          lastTaskCompletedAt: agent.last_task_completed_at,
          activity,
          state,
          timeInState: 0,
        };
      });

      setAgents(agentsWithData);
    };

    fetchData();

    // Subscribe to changes
    const subscription = supabase
      .channel('agent-tasks-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  // Smart movement logic
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const dt = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      setAgents(prev => {
        const occupiedPositions = prev.map(a => a.position);
        
        return prev.map(agent => {
          // Update time in state
          const timeInState = agent.timeInState + dt;

          // Movement logic based on state
          if (!agent.targetPosition) {
            // Agent is at destination - decide next move
            
            if (agent.state === 'working' && agent.currentTask) {
              // Working agents stay at desk, no movement
              return { ...agent, timeInState };
            }

            // Just finished task -> go to break
            if (agent.lastTask && agent.lastTaskCompletedAt && 
                (Date.now() - new Date(agent.lastTaskCompletedAt).getTime()) < 5 * 60 * 1000 &&
                agent.state !== 'break' && timeInState > 2) {
              const breakRoom = Math.random() > 0.5 ? ROOMS.kitchen : ROOMS.lounge;
              const pos = getPositionInRoom(breakRoom, occupiedPositions);
              return { 
                ...agent, 
                targetPosition: pos,
                state: 'break',
                activity: `Break after: ${agent.lastTask.title}`,
                timeInState: 0
              };
            }

            // Training mode -> go to gym
            if (agent.state === 'training' && timeInState > 3) {
              const pos = getPositionInRoom(ROOMS.gym, occupiedPositions);
              return {
                ...agent,
                targetPosition: pos,
                activity: 'Training: Learning new patterns',
                timeInState: 0
              };
            }

            // Multi-agent discussion -> War Room
            const discussingAgents = prev.filter(a => 
              a.state === 'meeting' && a.name !== agent.name
            );
            if (agent.state === 'meeting' && discussingAgents.length > 0 && timeInState > 2) {
              const pos = getPositionInRoom(ROOMS.conference, occupiedPositions);
              return {
                ...agent,
                targetPosition: pos,
                activity: `Meeting with: ${discussingAgents.map(a => a.name).join(', ')}`,
                timeInState: 0
              };
            }

            // Idle agents return to desk after break
            if (agent.state === 'break' && timeInState > 120) {
              const desk = DESKS.find(d => d.agent === agent.name);
              if (desk) {
                return {
                  ...agent,
                  targetPosition: { x: desk.x, y: desk.y },
                  state: 'idle',
                  activity: 'Back at desk',
                  timeInState: 0
                };
              }
            }

            // True idle - rare slow roaming
            if (agent.status === 'idle' && !agent.currentTask && Math.random() < 0.0003) {
              const zones = [ROOMS.lounge, ROOMS.kitchen];
              const randomZone = zones[Math.floor(Math.random() * zones.length)];
              const pos = getPositionInRoom(randomZone, occupiedPositions);
              return {
                ...agent,
                targetPosition: pos,
                state: 'idle',
                activity: 'Taking a stroll',
                timeInState: 0
              };
            }

            return { ...agent, timeInState };
          }

          // Move towards target
          const dx = agent.targetPosition.x - agent.position.x;
          const dy = agent.targetPosition.y - agent.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 3) {
            return { 
              ...agent, 
              targetPosition: null, 
              position: agent.targetPosition,
              timeInState: 0
            };
          }

          // Working agents move faster (urgency), idle agents move slower
          const speed = agent.state === 'working' ? 3 : 1.5;
          
          return {
            ...agent,
            position: {
              x: agent.position.x + (dx / distance) * speed,
              y: agent.position.y + (dy / distance) * speed,
            },
            timeInState
          };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Get agents in a room
  const getAgentsInRoom = (roomKey: string) => {
    const room = ROOMS[roomKey as keyof typeof ROOMS];
    return agents.filter(agent => 
      agent.position.x >= room.x && 
      agent.position.x <= room.x + room.width &&
      agent.position.y >= room.y &&
      agent.position.y <= room.y + room.height
    );
  };

  // Format time ago
  const timeAgo = (date: string | null) => {
    if (!date) return '';
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const workingCount = agents.filter(a => a.state === 'working').length;
  const inMeetingCount = agents.filter(a => a.state === 'meeting').length;

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0a0a12] via-[#12121e] to-[#0f1620] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `linear-gradient(rgba(0, 217, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.05) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-30 flex justify-between">
        <div className="flex gap-3">
          <div className="bg-[#0a0a12]/90 backdrop-blur border border-[#e94560]/30 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#e94560]" />
              <span className="text-[#eaeaea] text-sm font-mono font-bold">{workingCount} Working</span>
            </div>
          </div>
          <div className="bg-[#0a0a12]/90 backdrop-blur border border-[#00d9ff]/30 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00d9ff]" />
              <span className="text-[#eaeaea] text-sm font-mono font-bold">{inMeetingCount} In Meeting</span>
            </div>
          </div>
        </div>
      </div>

      {/* Office Layout */}
      <div className="relative w-full h-full pt-20">
        
        {/* Rooms with proper boundaries */}
        {Object.entries(ROOMS).map(([key, room]) => {
          const Icon = room.icon;
          const agentsInRoom = getAgentsInRoom(key);
          const isHovered = hoveredRoom === key;
          
          return (
            <div
              key={key}
              className="absolute rounded-2xl border-2 transition-all duration-300"
              style={{
                left: room.x, top: room.y, width: room.width, height: room.height,
                borderColor: isHovered ? '#00d9ff' : '#2a2a4a',
                backgroundColor: isHovered ? 'rgba(0, 217, 255, 0.08)' : 'rgba(20, 20, 35, 0.9)',
                boxShadow: isHovered ? '0 0 30px rgba(0, 217, 255, 0.2)' : 'none',
              }}
              onMouseEnter={() => setHoveredRoom(key)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              {/* Room label */}
              <div className="absolute -top-8 left-2 flex items-center gap-2 bg-[#0a0a12] px-3 py-1 rounded-full border border-[#2a2a4a]">
                <Icon className="w-4 h-4 text-[#7a7aaa]" />
                <span className="text-xs text-[#eaeaea] font-mono">{room.label}</span>
                <span className="text-[10px] text-[#7a7aaa] font-mono">({agentsInRoom.length}/{room.capacity})</span>
              </div>

              {/* Room tooltip on hover */}
              {isHovered && agentsInRoom.length > 0 && (
                <div className="absolute z-40 bg-[#0a0a12]/95 backdrop-blur border border-[#00d9ff]/30 rounded-xl p-3 min-w-[250px]" 
                  style={{ 
                    left: room.x > 500 ? -260 : room.width + 10, 
                    top: 10 
                  }}
                >
                  <p className="text-[10px] text-[#00d9ff] font-mono uppercase mb-2">Who's here:</p>
                  {agentsInRoom.map(agent => (
                    <div key={agent.name} className="mb-2 last:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#eaeaea] font-mono font-bold">{agent.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          agent.state === 'working' ? 'bg-[#e94560]' : 
                          agent.state === 'break' ? 'bg-[#ffd700]' : 'bg-[#00d9ff]'
                        }`} />
                      </div>
                      <p className="text-[10px] text-[#7a7aaa] font-mono truncate">
                        {agent.activity}
                      </p>
                      {agent.lastTask && (
                        <p className="text-[9px] text-[#4a7c59] font-mono">
                          Last: {agent.lastTask.title} ({timeAgo(agent.lastTaskCompletedAt)})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Desks */}
        {DESKS.map((desk) => {
          const dept = DEPARTMENTS[desk.dept];
          const Icon = dept.icon;
          const agent = agents.find(a => a.name === desk.agent);
          const isHovered = hoveredAgent === desk.agent;
          
          return (
            <div
              key={desk.agent}
              className="absolute"
              style={{ left: desk.x - 60, top: desk.y - 50 }}
              onMouseEnter={() => setHoveredAgent(desk.agent)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              {/* Desk station */}
              <div 
                className="w-28 h-24 rounded-xl border-2 transition-all duration-300 relative"
                style={{
                  borderColor: isHovered ? dept.color : '#2a2a4a',
                  backgroundColor: isHovered ? dept.bgColor : 'rgba(15, 15, 26, 0.95)',
                }}
              >
                <div className="h-6 flex items-center justify-center border-b border-[#2a2a4a] bg-[#1a1a2e] rounded-t-xl">
                  <Icon className="w-3 h-3 mr-1" style={{ color: dept.color }} />
                  <span className="text-[7px] text-[#eaeaea] font-mono uppercase">{desk.zone}</span>
                </div>
                <div className="flex flex-col items-center justify-center h-[calc(100%-24px)]">
                  <div className="w-14 h-10 rounded border-2 mb-1 flex items-center justify-center" style={{ borderColor: dept.color }}>
                    <div className="w-10 h-6 bg-[#0a0a12] rounded flex items-center justify-center">
                      <div className="w-8 h-4 rounded animate-pulse" style={{ backgroundColor: dept.color, opacity: 0.3 }} />
                    </div>
                  </div>
                  <span className="text-[9px] text-[#7a7aaa] font-mono">{desk.agent}</span>
                </div>
                <div 
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[6px] font-mono uppercase whitespace-nowrap"
                  style={{ backgroundColor: dept.color, color: '#0a0a12' }}
                >
                  {desk.label}
                </div>
              </div>

              {/* Agent hover tooltip */}
              {isHovered && agent && (
                <div className="absolute z-50 bg-[#0a0a12]/95 backdrop-blur border border-[#00d9ff]/30 rounded-xl p-3 min-w-[220px]" 
                  style={{ 
                    left: desk.x > 600 ? -240 : 130, 
                    top: -20 
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-[#eaeaea] font-bold font-mono">{agent.name}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                      agent.state === 'working' ? 'bg-[#e94560]/20 text-[#e94560]' :
                      agent.state === 'break' ? 'bg-[#ffd700]/20 text-[#ffd700]' :
                      'bg-[#00d9ff]/20 text-[#00d9ff]'
                    }`}>
                      {agent.state}
                    </span>
                  </div>
                  
                  {agent.currentTask ? (
                    <>
                      <p className="text-[10px] text-[#7a7aaa] font-mono mb-1">Current Task:</p>
                      <p className="text-xs text-[#eaeaea] font-mono font-bold mb-2 truncate">{agent.currentTask.title}</p>
                      <div className="w-full h-2 bg-[#1a1a2e] rounded-full mb-1">
                        <div 
                          className="h-full bg-[#00d9ff] rounded-full transition-all"
                          style={{ width: `${agent.currentTask.progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#00d9ff] font-mono">{agent.currentTask.progress}% complete</p>
                      {agent.currentTask.started_at && (
                        <p className="text-[9px] text-[#7a7aaa] font-mono mt-1">
                          Started: {timeAgo(agent.currentTask.started_at)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-[#7a7aaa] font-mono italic">No active task</p>
                  )}

                  {agent.lastTask && (
                    <div className="mt-2 pt-2 border-t border-[#2a2a4a]">
                      <p className="text-[9px] text-[#4a7c59] font-mono flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Last: {agent.lastTask.title} ({timeAgo(agent.lastTaskCompletedAt)})
                      </p>
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

      {/* Selected agent panel */}
      {selectedAgent && (
        <div className="absolute bottom-4 right-4 w-80 bg-[#0a0a12]/95 backdrop-blur border border-[#00d9ff]/30 rounded-2xl p-4 z-40">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[#eaeaea] font-bold font-mono text-lg">{selectedAgent.name}</h3>
              <p className="text-[#7a7aaa] text-xs font-mono">{selectedAgent.role}</p>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="text-[#7a7aaa] hover:text-[#eaeaea]">×</button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                selectedAgent.state === 'working' ? 'bg-[#e94560] animate-pulse' :
                selectedAgent.state === 'break' ? 'bg-[#ffd700]' : 'bg-[#00d9ff]'
              }`} />
              <span className="text-[#eaeaea] text-sm font-mono capitalize">{selectedAgent.state}</span>
            </div>
            <p className="text-[#7a7aaa] text-xs font-mono">{selectedAgent.activity}</p>
          </div>
        </div>
      )}
    </div>
  );
}
