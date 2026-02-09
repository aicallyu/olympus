import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OfficeAgent } from './OfficeAgent';
import { 
  Coffee, Users, Dumbbell, Monitor, Zap, Brain, Code, Shield, 
  Flame, BookOpen, MessageSquare, Terminal, CheckCircle, Crown, Sword, Scroll, Eye
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  started_at: string | null;
  completed_at: string | null;
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

// Olymp Theme Colors - Each agent has their own color world
const AGENT_THEMES: Record<string, { 
  primary: string; 
  secondary: string; 
  accent: string;
  marble: string;
  icon: any;
  title: string;
}> = {
  ARGOS: { 
    primary: '#FFD700', 
    secondary: '#B8860B', 
    accent: '#FFA500',
    marble: '#FFF8DC',
    icon: Crown,
    title: 'King of Olympus'
  },
  ATLAS: { 
    primary: '#00CED1', 
    secondary: '#008B8B', 
    accent: '#5F9EA0',
    marble: '#E0FFFF',
    icon: Eye,
    title: 'Frontend Titan'
  },
  HERCULOS: { 
    primary: '#FF4500', 
    secondary: '#DC143C', 
    accent: '#FF6347',
    marble: '#FFE4E1',
    icon: Sword,
    title: 'Backend Champion'
  },
  ATHENA: { 
    primary: '#C0C0C0', 
    secondary: '#A9A9A9', 
    accent: '#D3D3D3',
    marble: '#F5F5F5',
    icon: Shield,
    title: 'Goddess of QA'
  },
  APOLLO: { 
    primary: '#FF1493', 
    secondary: '#C71585', 
    accent: '#FF69B4',
    marble: '#FFF0F5',
    icon: Flame,
    title: 'Creative Muse'
  },
  PROMETHEUS: { 
    primary: '#32CD32', 
    secondary: '#228B22', 
    accent: '#00FF7F',
    marble: '#F0FFF0',
    icon: Zap,
    title: 'Infrastructure Titan'
  },
  HERMES: { 
    primary: '#DAA520', 
    secondary: '#8B4513', 
    accent: '#CD853F',
    marble: '#FFF8DC',
    icon: Scroll,
    title: 'Messenger of Docs'
  },
  Claude: { 
    primary: '#9370DB', 
    secondary: '#8A2BE2', 
    accent: '#BA55D3',
    marble: '#E6E6FA',
    icon: Brain,
    title: 'AI Architect'
  },
  Juan: { 
    primary: '#4169E1', 
    secondary: '#0000CD', 
    accent: '#1E90FF',
    marble: '#F0F8FF',
    icon: Crown,
    title: 'System Architect'
  },
  Nathanael: { 
    primary: '#20B2AA', 
    secondary: '#008080', 
    accent: '#48D1CC',
    marble: '#E0FFFF',
    icon: Code,
    title: 'Frontend Developer'
  },
};

// Olymp Temple Grid Layout - Clean, no overlaps
const TEMPLE_LAYOUT = {
  // Top Row - Command & Strategy
  ARGOS:      { x: 100, y: 80,  width: 180, height: 140, room: 'throne' },
  Juan:       { x: 320, y: 80,  width: 160, height: 140, room: 'executive' },
  
  // Middle Row - Engineering & AI
  ATLAS:      { x: 60,  y: 260, width: 160, height: 130, room: 'workshop' },
  HERCULOS:   { x: 240, y: 260, width: 160, height: 130, room: 'forge' },
  Claude:     { x: 420, y: 260, width: 160, height: 130, room: 'library' },
  Nathanael:  { x: 600, y: 260, width: 140, height: 130, room: 'frontend' },
  
  // Bottom Row - Support & Creative
  ATHENA:     { x: 60,  y: 430, width: 140, height: 130, room: 'temple' },
  PROMETHEUS: { x: 220, y: 430, width: 160, height: 130, room: 'lab' },
  APOLLO:     { x: 400, y: 430, width: 140, height: 130, room: 'studio' },
  HERMES:     { x: 560, y: 430, width: 140, height: 130, room: 'archive' },
  
  // Common Areas - Right Side
  kitchen:    { x: 760, y: 80,  width: 150, height: 120, label: 'Ambrosia Hall', icon: Coffee },
  lounge:     { x: 760, y: 220, width: 150, height: 120, label: 'Resting Gardens', icon: MessageSquare },
  gym:        { x: 760, y: 360, width: 150, height: 120, label: 'Training Grounds', icon: Dumbbell },
  warRoom:    { x: 760, y: 500, width: 150, height: 100, label: 'War Room', icon: Terminal },
};

function getRoomCenter(roomKey: string): {x: number, y: number} {
  const room = TEMPLE_LAYOUT[roomKey as keyof typeof TEMPLE_LAYOUT];
  if (!room || !('room' in room)) return { x: 400, y: 300 };
  return {
    x: room.x + room.width / 2,
    y: room.y + room.height / 2
  };
}

export function PixelOffice() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const animationRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(Date.now());

  // Fetch agents
  useEffect(() => {
    const fetchData = async () => {
      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, name, role, status, current_task_id, type, last_completed_task_id, last_task_completed_at')
        .order('name');

      if (!agentsData) return;

      const currentTaskIds = agentsData.map(a => a.current_task_id).filter(Boolean);
      const { data: currentTasks } = currentTaskIds.length > 0 
        ? await supabase.from('tasks').select('*').in('id', currentTaskIds)
        : { data: [] };

      const lastTaskIds = agentsData.map(a => a.last_completed_task_id).filter(Boolean);
      const { data: lastTasks } = lastTaskIds.length > 0
        ? await supabase.from('tasks').select('*').in('id', lastTaskIds)
        : { data: [] };

      const currentTasksMap = new Map(currentTasks?.map((t: Task) => [t.id, t]) || []);
      const lastTasksMap = new Map(lastTasks?.map((t: Task) => [t.id, t]) || []);

      const agentsWithData: Agent[] = agentsData.map((agent: any) => {
        const layout = TEMPLE_LAYOUT[agent.name as keyof typeof TEMPLE_LAYOUT];
        const center = layout && 'room' in layout ? 
          { x: layout.x + layout.width / 2, y: layout.y + layout.height / 2 } :
          { x: 400, y: 300 };
          
        const currentTask = agent.current_task_id ? currentTasksMap.get(agent.current_task_id) : null;
        const lastTask = agent.last_completed_task_id ? lastTasksMap.get(agent.last_completed_task_id) : null;
        
        const isWorking = agent.status === 'working' && currentTask;

        return {
          ...agent,
          position: center,
          targetPosition: null,
          currentTask,
          lastTask,
          lastTaskCompletedAt: agent.last_task_completed_at,
          activity: isWorking ? `Working: ${currentTask.title}` : 'Idle',
          state: isWorking ? 'working' : 'idle',
          timeInState: 0,
        };
      });

      setAgents(agentsWithData);
    };

    fetchData();

    const subscription = supabase
      .channel('agent-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const dt = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      setAgents(prev => prev.map(agent => {
        const timeInState = agent.timeInState + dt;

        if (!agent.targetPosition) {
          // Working agents stay in their room
          if (agent.state === 'working') {
            return { ...agent, timeInState };
          }

          // Movement logic for breaks
          if (agent.state === 'break' && timeInState > 120) {
            const room = TEMPLE_LAYOUT[agent.name as keyof typeof TEMPLE_LAYOUT];
            if (room && 'room' in room) {
              return {
                ...agent,
                targetPosition: { x: room.x + room.width / 2, y: room.y + room.height / 2 },
                state: 'idle',
                activity: 'Back in temple',
                timeInState: 0
              };
            }
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

        const speed = agent.state === 'working' ? 2 : 1;
        return {
          ...agent,
          position: {
            x: agent.position.x + (dx / distance) * speed,
            y: agent.position.y + (dy / distance) * speed,
          },
          timeInState
        };
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const getAgentsInRoom = (roomKey: string) => {
    const room = TEMPLE_LAYOUT[roomKey as keyof typeof TEMPLE_LAYOUT];
    if (!room || 'room' in room) return [];
    return agents.filter(agent => {
      const agentRoom = TEMPLE_LAYOUT[agent.name as keyof typeof TEMPLE_LAYOUT];
      return agentRoom && 'room' in agentRoom && agentRoom.room === roomKey;
    });
  };

  const timeAgo = (date: string | null) => {
    if (!date) return '';
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const workingCount = agents.filter(a => a.state === 'working').length;

  return (
    <div className="w-full h-full bg-[#0a0a0f] relative overflow-hidden font-mono">
      {/* Marble Temple Background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,215,0,0.1) 1px, transparent 1px),
            linear-gradient(rgba(255,215,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Temple Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#1a1a2e] to-transparent z-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-[#FFD700]" />
          <span className="text-[#FFD700] text-lg font-bold tracking-wider">OLYMPUS COMMAND</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#e94560] animate-pulse" />
            <span className="text-[#eaeaea]">{workingCount} Working</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ffd700]" />
            <span className="text-[#eaeaea]">{agents.length - workingCount} Idle</span>
          </div>
        </div>
      </div>

      {/* Temple Grid */}
      <div className="absolute inset-0 pt-20 pb-24 px-4 overflow-auto">
        <div className="relative w-[950px] h-[650px] mx-auto">
          
          {/* Greek Columns Decoration */}
          {[50, 250, 450, 650, 850].map((x, i) => (
            <div 
              key={i}
              className="absolute top-0 bottom-0 w-4 bg-gradient-to-b from-[#DAA520] via-[#B8860B] to-[#8B4513] opacity-30"
              style={{ left: x }}
            />
          ))}

          {/* Agent Temple Rooms */}
          {Object.entries(TEMPLE_LAYOUT).map(([key, room]) => {
            if (!('room' in room)) return null;
            
            const theme = AGENT_THEMES[key];
            const Icon = theme.icon;
            const agent = agents.find(a => a.name === key);
            const isHovered = hoveredAgent === key;
            
            return (
              <div
                key={key}
                className="absolute rounded-lg border-2 transition-all duration-300 overflow-hidden"
                style={{
                  left: room.x,
                  top: room.y,
                  width: room.width,
                  height: room.height,
                  borderColor: isHovered ? theme.primary : theme.secondary,
                  background: `linear-gradient(135deg, ${theme.marble}15 0%, ${theme.primary}10 100%)`,
                  boxShadow: isHovered ? `0 0 20px ${theme.primary}40` : 'none',
                }}
                onMouseEnter={() => setHoveredAgent(key)}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {/* Room Header */}
                <div 
                  className="h-7 flex items-center justify-between px-3 border-b"
                  style={{ borderColor: theme.primary + '40', backgroundColor: theme.primary + '15' }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: theme.primary }} />
                    <span className="text-[9px] text-[#eaeaea] font-bold uppercase tracking-wider">{key}</span>
                  </div>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" 
                    style={{ backgroundColor: theme.primary, color: '#0a0a0f' }}>
                    {theme.title}
                  </span>
                </div>

                {/* Room Content */}
                <div className="p-2 h-[calc(100%-28px)] flex flex-col">
                  {/* Thematic Elements */}
                  {key === 'ARGOS' && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-16 h-12 bg-[#FFD700]/20 rounded-lg border border-[#FFD700]/40 flex items-center justify-center">
                        <Crown className="w-8 h-8 text-[#FFD700]/60" />
                      </div>
                    </div>
                  )}
                  {key === 'ATLAS' && (
                    <div className="flex-1 grid grid-cols-2 gap-1 p-1">
                      <div className="bg-[#00CED1]/20 rounded border border-[#00CED1]/30" />
                      <div className="bg-[#00CED1]/20 rounded border border-[#00CED1]/30" />
                      <div className="bg-[#00CED1]/20 rounded border border-[#00CED1]/30" />
                      <div className="bg-[#00CED1]/20 rounded border border-[#00CED1]/30" />
                    </div>
                  )}
                  {key === 'HERCULOS' && (
                    <div className="flex-1 flex items-center justify-center gap-2">
                      <div className="w-4 h-12 bg-[#FF4500]/30 rounded border border-[#FF4500]/50" />
                      <Sword className="w-6 h-6 text-[#FF4500]/50" />
                    </div>
                  )}
                  {key === 'Claude' && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-14 h-14 bg-[#9370DB]/20 rounded-full border border-[#9370DB]/40 flex items-center justify-center">
                        <Brain className="w-8 h-8 text-[#9370DB]/60" />
                      </div>
                    </div>
                  )}
                  
                  {/* Agent Status */}
                  {agent && (
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          agent.state === 'working' ? 'bg-[#e94560] animate-pulse' : 'bg-[#ffd700]'
                        }`} />
                        <span className="text-[8px] text-[#7a7aaa]">{agent.state}</span>
                      </div>
                      {agent.currentTask && (
                        <div className="w-12 h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${agent.currentTask.progress}%`,
                              backgroundColor: theme.primary
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Hover Tooltip */}
                {isHovered && agent && (
                  <div className="absolute z-50 bg-[#0a0a0f]/95 backdrop-blur border rounded-lg p-3 min-w-[200px]"
                    style={{ borderColor: theme.primary + '40', left: room.width + 10, top: 10 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#eaeaea] font-bold">{agent.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" 
                        style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                        {agent.state}
                      </span>
                    </div>
                    {agent.currentTask ? (
                      <>
                        <p className="text-[10px] text-[#7a7aaa] mb-1">{agent.currentTask.title}</p>
                        <div className="w-full h-1.5 bg-[#1a1a2e] rounded-full">
                          <div className="h-full rounded-full transition-all" 
                            style={{ width: `${agent.currentTask.progress}%`, backgroundColor: theme.primary }} />
                        </div>
                        <p className="text-[9px] text-[#7a7aaa] mt-1">{agent.currentTask.progress}%</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-[#7a7aaa] italic">No active task</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Common Areas */}
          {['kitchen', 'lounge', 'gym', 'warRoom'].map((key) => {
            const room = TEMPLE_LAYOUT[key as keyof typeof TEMPLE_LAYOUT];
            if (!room || 'room' in room) return null;
            
            const Icon = room.icon;
            const isHovered = hoveredRoom === key;
            
            return (
              <div
                key={key}
                className="absolute rounded-lg border-2 border-[#DAA520]/40 bg-[#1a1a2e]/80 transition-all duration-300"
                style={{
                  left: room.x,
                  top: room.y,
                  width: room.width,
                  height: room.height,
                  boxShadow: isHovered ? '0 0 20px rgba(218,165,32,0.3)' : 'none',
                }}
                onMouseEnter={() => setHoveredRoom(key)}
                onMouseLeave={() => setHoveredRoom(null)}
              >
                <div className="h-6 flex items-center justify-center border-b border-[#DAA520]/30 bg-[#DAA520]/10">
                  <Icon className="w-3.5 h-3.5 text-[#DAA520] mr-2" />
                  <span className="text-[9px] text-[#DAA520] font-bold">{room.label}</span>
                </div>
                <div className="p-2 flex items-center justify-center h-[calc(100%-24px)]">
                  {key === 'kitchen' && <Coffee className="w-8 h-8 text-[#DAA520]/40" />}
                  {key === 'lounge' && <MessageSquare className="w-8 h-8 text-[#4ecdc4]/40" />}
                  {key === 'gym' && <Dumbbell className="w-8 h-8 text-[#e94560]/40" />}
                  {key === 'warRoom' && <Terminal className="w-8 h-8 text-[#ffd700]/40" />}
                </div>
              </div>
            );
          })}

          {/* Agents */}
          {agents.map((agent) => (
            <OfficeAgent
              key={agent.id}
              agent={agent}
              theme={AGENT_THEMES[agent.name]}
              onClick={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      </div>

      {/* Status Bar - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent z-30">
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          {/* Agent Status List */}
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-[70%]">
            {agents.map(agent => {
              const theme = AGENT_THEMES[agent.name];
              return (
                <div 
                  key={agent.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all hover:scale-105"
                  style={{ 
                    borderColor: theme.primary + '40',
                    backgroundColor: theme.primary + '10'
                  }}
                  onClick={() => setSelectedAgent(agent)}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    agent.state === 'working' ? 'bg-[#e94560] animate-pulse' : 'bg-[#ffd700]'
                  }`} />
                  <span className="text-[10px] text-[#eaeaea] font-bold whitespace-nowrap">{agent.name}</span>
                  <span className="text-[9px] text-[#7a7aaa] uppercase">{agent.state}</span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-3 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#e94560] animate-pulse" />
              <span className="text-[#7a7aaa]">Working</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#ffd700]" />
              <span className="text-[#7a7aaa]">Idle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Agent Panel */}
      {selectedAgent && (
        <div className="absolute bottom-24 right-4 w-72 bg-[#0a0a0f]/95 backdrop-blur border border-[#FFD700]/30 rounded-xl p-4 z-40">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[#eaeaea] font-bold text-lg">{selectedAgent.name}</h3>
              <p className="text-[#7a7aaa] text-xs">{selectedAgent.role}</p>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="text-[#7a7aaa] hover:text-[#eaeaea]">×</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                selectedAgent.state === 'working' ? 'bg-[#e94560] animate-pulse' : 'bg-[#ffd700]'
              }`} />
              <span className="text-[#eaeaea] text-sm capitalize">{selectedAgent.state}</span>
            </div>
            <p className="text-[#7a7aaa] text-xs">{selectedAgent.activity}</p>
          </div>
        </div>
      )}
    </div>
  );
}
