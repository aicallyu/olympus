import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OfficeAgent } from './OfficeAgent';
import { Coffee, Users, Dumbbell, Monitor, Zap, Brain, Code, Shield, Flame, BookOpen, MessageSquare, Terminal, Building2 } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'offline';
  current_task_id: string | null;
  type: 'ai' | 'human';
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  activity: string;
}

// Modern tech office zones with departments
const DEPARTMENTS: Record<string, { icon: any; color: string; bgColor: string; desc: string }> = {
  'Command': { icon: Zap, color: '#ffd700', bgColor: 'rgba(255, 215, 0, 0.1)', desc: 'Orchestration & Strategy' },
  'Engineering': { icon: Code, color: '#00d9ff', bgColor: 'rgba(0, 217, 255, 0.1)', desc: 'Frontend & Backend' },
  'AI Lab': { icon: Brain, color: '#ff6bff', bgColor: 'rgba(255, 107, 255, 0.1)', desc: 'Architecture & AI' },
  'Creative': { icon: Flame, color: '#ff6b9d', bgColor: 'rgba(255, 107, 157, 0.1)', desc: 'Design & Visual Arts' },
  'Operations': { icon: Shield, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', desc: 'DevOps & QA' },
  'Knowledge': { icon: BookOpen, color: '#b8965a', bgColor: 'rgba(184, 150, 90, 0.1)', desc: 'Docs & Communication' },
};

// Enhanced desk configuration with departments
const DESKS = [
  { x: 150, y: 180, agent: 'ARGOS', dept: 'Command', zone: 'Command Center', label: 'Hub' },
  { x: 350, y: 180, agent: 'ATLAS', dept: 'Engineering', zone: 'Frontend Squad', label: 'FE Lead' },
  { x: 550, y: 180, agent: 'Claude', dept: 'AI Lab', zone: 'AI Research', label: 'Architect' },
  { x: 150, y: 320, agent: 'ATHENA', dept: 'Operations', zone: 'Quality Assurance', label: 'QA Lead' },
  { x: 350, y: 320, agent: 'HERCULOS', dept: 'Engineering', zone: 'Backend Squad', label: 'BE Lead' },
  { x: 550, y: 320, agent: 'APOLLO', dept: 'Creative', zone: 'Design Studio', label: 'Creative Dir' },
  { x: 150, y: 460, agent: 'PROMETHEUS', dept: 'Operations', zone: 'Infrastructure', label: 'DevOps' },
  { x: 350, y: 460, agent: 'HERMES', dept: 'Knowledge', zone: 'Documentation', label: 'Tech Writer' },
  { x: 750, y: 250, agent: 'Juan', dept: 'Command', zone: 'Executive Suite', label: 'System Arch' },
  { x: 750, y: 380, agent: 'Nathanael', dept: 'Engineering', zone: 'Frontend Squad', label: 'Frontend Dev' },
];

const ZONES = {
  conference: { x: 900, y: 280, width: 180, height: 120, label: 'War Room', icon: Terminal },
  kitchen: { x: 80, y: 80, width: 160, height: 100, label: 'The Kitchen', icon: Coffee },
  gym: { x: 800, y: 80, width: 140, height: 100, label: 'Power Gym', icon: Dumbbell },
  lounge: { x: 450, y: 60, width: 200, height: 100, label: 'Chill Zone', icon: MessageSquare },
};

const ACTIVITIES = [
  'Grabbing coffee...',
  'Code review in progress...',
  'Deep in thought...',
  'Debugging session...',
  'Researching solutions...',
  'Performance tuning...',
  'Strategic planning...',
  'Running tests...',
  'In a meeting...',
  'Taking a break...',
];

export function PixelOffice() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hoveredDesk, setHoveredDesk] = useState<string | null>(null);
  const animationRef = useRef<number>();

  // Fetch agents from Supabase
  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, name, role, status, current_task_id, type')
        .order('name');

      if (data) {
        const agentsWithPositions: Agent[] = data.map((agent: any) => {
          const desk = DESKS.find(d => d.agent === agent.name);
          return {
            ...agent,
            position: desk ? { x: desk.x, y: desk.y } : { x: 400, y: 300 },
            targetPosition: null,
            activity: agent.status === 'working' ? 'Working on task...' : 'Idle',
          };
        });
        setAgents(agentsWithPositions);
      }
    };

    fetchAgents();

    const subscription = supabase
      .channel('agent-status')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agents' },
        (payload: { new: Partial<Agent> }) => {
          setAgents(prev => prev.map(agent => {
            if (payload.new.id && agent.id === payload.new.id) {
              const updated = { ...agent, ...payload.new };
              if (payload.new.status === 'working' && agent.status !== 'working') {
                const desk = DESKS.find(d => d.agent === agent.name);
                if (desk) {
                  updated.targetPosition = { x: desk.x, y: desk.y };
                  updated.activity = 'Working on task...';
                }
              }
              return updated;
            }
            return agent;
          }));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAgents(prev => prev.map(agent => {
        if (!agent.targetPosition) {
          if (agent.status === 'idle' && Math.random() < 0.0008) {
            const zones = [ZONES.kitchen, ZONES.lounge, ZONES.gym, ZONES.conference];
            const randomZone = zones[Math.floor(Math.random() * zones.length)];
            return {
              ...agent,
              targetPosition: {
                x: randomZone.x + 20 + Math.random() * (randomZone.width - 40),
                y: randomZone.y + 20 + Math.random() * (randomZone.height - 40),
              },
              activity: ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)],
            };
          }
          return agent;
        }

        const dx = agent.targetPosition.x - agent.position.x;
        const dy = agent.targetPosition.y - agent.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 2) {
          return { ...agent, targetPosition: null, position: agent.targetPosition };
        }

        const speed = 2;
        return {
          ...agent,
          position: {
            x: agent.position.x + (dx / distance) * speed,
            y: agent.position.y + (dy / distance) * speed,
          },
        };
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const workingCount = agents.filter(a => a.status === 'working').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e] relative overflow-hidden">
      {/* Animated grid background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#00d9ff] rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header Stats Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <div className="flex gap-3">
          <div className="bg-[#0f0f1a]/90 backdrop-blur-md border border-[#00d9ff]/30 rounded-xl px-4 py-2 shadow-lg shadow-[#00d9ff]/10">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#e94560]" />
              <span className="text-[#eaeaea] text-sm font-mono font-bold">{workingCount} Working</span>
            </div>
          </div>
          <div className="bg-[#0f0f1a]/90 backdrop-blur-md border border-[#ffd700]/30 rounded-xl px-4 py-2 shadow-lg shadow-[#ffd700]/10">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-[#ffd700]" />
              <span className="text-[#eaeaea] text-sm font-mono font-bold">{idleCount} Idle</span>
            </div>
          </div>
          <div className="bg-[#0f0f1a]/90 backdrop-blur-md border border-[#00d9ff]/30 rounded-xl px-4 py-2 shadow-lg shadow-[#00d9ff]/10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00d9ff]" />
              <span className="text-[#eaeaea] text-sm font-mono font-bold">{agents.length} Total</span>
            </div>
          </div>
        </div>

        {/* Department Legend */}
        <div className="flex gap-2">
          {Object.entries(DEPARTMENTS).map(([name, dept]) => (
            <div key={name} className="flex items-center gap-1 bg-[#0f0f1a]/80 rounded-lg px-2 py-1">
              <dept.icon className="w-3 h-3" style={{ color: dept.color }} />
              <span className="text-[10px] text-[#7a7aaa] font-mono">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Office Canvas */}
      <div className="relative w-full h-full pt-20">
        {/* Department Zones with Labels */}
        <div className="absolute left-8 top-24 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#ffd700]" />
          <span className="text-xs font-mono text-[#ffd700] uppercase tracking-wider">Command Floor</span>
        </div>

        <div className="absolute left-8 top-36 flex items-center gap-2">
          <Code className="w-5 h-5 text-[#00d9ff]" />
          <span className="text-xs font-mono text-[#00d9ff] uppercase tracking-wider">Engineering Wing</span>
        </div>

        <div className="absolute left-8 top-48 flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#ff6bff]" />
          <span className="text-xs font-mono text-[#ff6bff] uppercase tracking-wider">AI Research Lab</span>
        </div>

        {/* Modern Kitchen */}
        <div 
          className="absolute rounded-2xl border-2 border-[#ff6b6b]/50 bg-gradient-to-br from-[#2d1f1f] to-[#1f1515] shadow-xl shadow-[#ff6b6b]/10"
          style={{ left: ZONES.kitchen.x, top: ZONES.kitchen.y, width: ZONES.kitchen.width, height: ZONES.kitchen.height }}
        >
          <div className="absolute -top-7 left-3 flex items-center gap-2 bg-[#0f0f1a] px-3 py-1 rounded-full border border-[#ff6b6b]/30">
            <Coffee className="w-4 h-4 text-[#ff6b6b]" />
            <span className="text-xs text-[#ff6b6b] font-mono font-bold">{ZONES.kitchen.label}</span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            <div className="w-full h-8 bg-[#3d2828] rounded-lg flex items-center justify-center">
              <span className="text-[8px] text-[#ff6b6b]/60">☕ Espresso</span>
            </div>
            <div className="w-full h-8 bg-[#3d2828] rounded-lg flex items-center justify-center">
              <span className="text-[8px] text-[#ff6b6b]/60">🥤 Snacks</span>
            </div>
          </div>
        </div>

        {/* Modern Chill Zone */}
        <div 
          className="absolute rounded-2xl border-2 border-[#4ecdc4]/50 bg-gradient-to-br from-[#1f2d2d] to-[#151f1f] shadow-xl shadow-[#4ecdc4]/10"
          style={{ left: ZONES.lounge.x, top: ZONES.lounge.y, width: ZONES.lounge.width, height: ZONES.lounge.height }}
        >
          <div className="absolute -top-7 left-3 flex items-center gap-2 bg-[#0f0f1a] px-3 py-1 rounded-full border border-[#4ecdc4]/30">
            <MessageSquare className="w-4 h-4 text-[#4ecdc4]" />
            <span className="text-xs text-[#4ecdc4] font-mono font-bold">{ZONES.lounge.label}</span>
          </div>
          <div className="flex justify-around items-center h-full px-2">
            <div className="w-12 h-6 bg-[#2d3d3d] rounded-lg" />
            <div className="w-12 h-6 bg-[#2d3d3d] rounded-lg" />
            <div className="w-12 h-6 bg-[#2d3d3d] rounded-lg" />
          </div>
        </div>

        {/* Modern Gym */}
        <div 
          className="absolute rounded-2xl border-2 border-[#e94560]/50 bg-gradient-to-br from-[#2d1f1f] to-[#1f1515] shadow-xl shadow-[#e94560]/10"
          style={{ left: ZONES.gym.x, top: ZONES.gym.y, width: ZONES.gym.width, height: ZONES.gym.height }}
        >
          <div className="absolute -top-7 left-3 flex items-center gap-2 bg-[#0f0f1a] px-3 py-1 rounded-full border border-[#e94560]/30">
            <Dumbbell className="w-4 h-4 text-[#e94560]" />
            <span className="text-xs text-[#e94560] font-mono font-bold">{ZONES.gym.label}</span>
          </div>
          <div className="flex items-center justify-center h-full gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3d1f1f] border-2 border-[#e94560]/30" />
            <div className="w-2 h-10 bg-[#3d1f1f] rounded" />
          </div>
        </div>

        {/* War Room - Conference */}
        <div 
          className="absolute rounded-2xl border-2 border-[#ffd700]/50 bg-gradient-to-br from-[#3d3d1f] to-[#2d2d15] shadow-xl shadow-[#ffd700]/10"
          style={{ left: ZONES.conference.x, top: ZONES.conference.y, width: ZONES.conference.width, height: ZONES.conference.height }}
        >
          <div className="absolute -top-7 left-3 flex items-center gap-2 bg-[#0f0f1a] px-3 py-1 rounded-full border border-[#ffd700]/30">
            <Terminal className="w-4 h-4 text-[#ffd700]" />
            <span className="text-xs text-[#ffd700] font-mono font-bold">{ZONES.conference.label}</span>
          </div>
          <div className="absolute inset-4 border border-[#ffd700]/20 rounded-xl flex items-center justify-center">
            <div className="w-24 h-12 bg-[#4a4a2a] rounded-xl border border-[#ffd700]/30 flex items-center justify-center">
              <span className="text-[10px] text-[#ffd700]/60 font-mono">STRATEGY</span>
            </div>
          </div>
        </div>

        {/* Modern Desks with Department Labels */}
        {DESKS.map((desk) => {
          const dept = DEPARTMENTS[desk.dept];
          const Icon = dept.icon;
          const isHovered = hoveredDesk === desk.agent;
          
          return (
            <div
              key={desk.agent}
              className="absolute group"
              style={{ left: desk.x - 50, top: desk.y - 40 }}
              onMouseEnter={() => setHoveredDesk(desk.agent)}
              onMouseLeave={() => setHoveredDesk(null)}
            >
              {/* Desk Workstation */}
              <div 
                className="w-24 h-20 rounded-xl border-2 transition-all duration-300 relative overflow-hidden"
                style={{ 
                  borderColor: dept.color,
                  backgroundColor: isHovered ? dept.bgColor : 'rgba(15, 15, 26, 0.9)',
                  boxShadow: isHovered ? `0 0 20px ${dept.color}40` : 'none',
                }}
              >
                {/* Desk Header with Zone */}
                <div 
                  className="h-5 flex items-center justify-center border-b"
                  style={{ borderColor: `${dept.color}30`, backgroundColor: `${dept.color}15` }}
                >
                  <Icon className="w-3 h-3 mr-1" style={{ color: dept.color }} />
                  <span className="text-[7px] text-[#eaeaea] font-mono uppercase tracking-wider truncate px-1">
                    {desk.zone}
                  </span>
                </div>

                {/* Desk Content */}
                <div className="p-2 flex flex-col items-center justify-center h-[calc(100%-20px)]">
                  {/* Monitor */}
                  <div 
                    className="w-12 h-8 rounded border-2 mb-1 relative overflow-hidden"
                    style={{ borderColor: dept.color }}
                  >
                    <div className="absolute inset-0 bg-[#0a0a0f]" />
                    <div 
                      className="absolute inset-1 rounded opacity-40 animate-pulse"
                      style={{ backgroundColor: dept.color }}
                    />
                  </div>

                  {/* Agent Label */}
                  <span className="text-[8px] text-[#7a7aaa] font-mono">{desk.agent}</span>
                </div>

                {/* Department Badge */}
                <div 
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[6px] font-mono uppercase whitespace-nowrap"
                  style={{ 
                    backgroundColor: dept.color,
                    color: '#0f0f1a',
                  }}
                >
                  {desk.label}
                </div>
              </div>

              {/* Hover Tooltip */}
              {isHovered && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-[#0f0f1a] border border-[#7a7aaa]/30 rounded-lg px-3 py-2 whitespace-nowrap z-30">
                  <p className="text-[10px] text-[#eaeaea] font-mono font-bold">{desk.agent}</p>
                  <p className="text-[8px] text-[#7a7aaa] font-mono">{desk.zone}</p>
                  <p className="text-[8px] text-[#4a7c59] font-mono italic">{dept.desc}</p>
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

      {/* Agent Details Panel */}
      {selectedAgent && (
        <div className="absolute bottom-4 right-4 w-72 bg-[#0f0f1a]/95 backdrop-blur-xl border border-[#00d9ff]/30 rounded-2xl p-4 z-30 shadow-2xl shadow-[#00d9ff]/20">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[#eaeaea] font-bold font-mono text-lg">{selectedAgent.name}</h3>
              <p className="text-[#7a7aaa] text-xs font-mono">{selectedAgent.role}</p>
            </div>
            <button 
              onClick={() => setSelectedAgent(null)}
              className="text-[#7a7aaa] hover:text-[#eaeaea] text-xl leading-none"
            >
              ×
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              selectedAgent.status === 'working' ? 'bg-[#e94560]' :
              selectedAgent.status === 'idle' ? 'bg-[#ffd700]' : 'bg-[#666]'
            }`} />
            <span className="text-[#eaeaea] text-sm font-mono capitalize">{selectedAgent.status}</span>
          </div>

          <div className="bg-[#1a1a2e] rounded-lg p-2 mb-2">
            <p className="text-[#4a7c59] text-xs font-mono">{selectedAgent.activity}</p>
          </div>

          {selectedAgent.current_task_id && (
            <div className="flex items-center gap-2 text-[#00d9ff]">
              <Terminal className="w-3 h-3" />
              <span className="text-[10px] font-mono">Task: {selectedAgent.current_task_id.slice(0, 12)}...</span>
            </div>
          )}
        </div>
      )}

      {/* Status Legend */}
      <div className="absolute bottom-4 left-4 bg-[#0f0f1a]/90 backdrop-blur-xl border border-[#7a7aaa]/30 rounded-xl p-3 z-20">
        <p className="text-[10px] text-[#7a7aaa] font-mono uppercase mb-2 tracking-wider">Status</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e94560] animate-pulse shadow-lg shadow-[#e94560]/50" />
            <span className="text-xs text-[#eaeaea] font-mono">Working</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffd700] shadow-lg shadow-[#ffd700]/50" />
            <span className="text-xs text-[#eaeaea] font-mono">Idle</span>
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
