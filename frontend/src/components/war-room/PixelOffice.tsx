import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OfficeAgent } from './OfficeAgent';
import { MapPin, Users, Coffee, Dumbbell, Monitor } from 'lucide-react';

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

// Office zones
const ZONES = {
  desks: [
    { x: 100, y: 150, agent: 'ARGOS', label: 'ARGOS Hub' },
    { x: 250, y: 150, agent: 'ATLAS', label: 'ATLAS Desk' },
    { x: 400, y: 150, agent: 'Claude', label: 'Claude Station' },
    { x: 100, y: 300, agent: 'ATHENA', label: 'ATHENA Desk' },
    { x: 250, y: 300, agent: 'HERCULOS', label: 'HERCULOS Desk' },
    { x: 400, y: 300, agent: 'APOLLO', label: 'APOLLO Studio' },
    { x: 100, y: 450, agent: 'PROMETHEUS', label: 'PROMETHEUS Lab' },
    { x: 250, y: 450, agent: 'HERMES', label: 'HERMES Desk' },
    { x: 550, y: 200, agent: 'Juan', label: 'Juan Office' },
    { x: 550, y: 350, agent: 'Nathanael', label: 'Nathanael Desk' },
  ],
  conference: { x: 700, y: 250, width: 150, height: 100, label: 'War Room' },
  kitchen: { x: 50, y: 50, width: 120, height: 80, label: 'Kitchen' },
  gym: { x: 650, y: 50, width: 100, height: 80, label: 'Gym' },
  lounge: { x: 350, y: 50, width: 150, height: 80, label: 'Break Room' },
};

const ACTIVITIES = [
  'Getting coffee...',
  'Reviewing code...',
  'In deep thought...',
  'Debugging...',
  'Researching...',
  'Optimizing...',
  'Planning...',
  'Testing...',
];

export function PixelOffice() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch agents from Supabase
  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, name, role, status, current_task_id, type')
        .order('name');

      if (data) {
        const agentsWithPositions: Agent[] = data.map((agent: any) => {
          const desk = ZONES.desks.find(d => d.agent === agent.name);
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

    // Subscribe to agent status changes
    const subscription = supabase
      .channel('agent-status')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          setAgents(prev => prev.map(agent => {
            if (agent.id === payload.new.id) {
              const updated = { ...agent, ...payload.new };
              // If status changed to working, move to desk
              if (payload.new.status === 'working' && agent.status !== 'working') {
                const desk = ZONES.desks.find(d => d.agent === agent.name);
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

  // Animation loop for agent movement
  useEffect(() => {
    const animate = () => {
      setAgents(prev => prev.map(agent => {
        if (!agent.targetPosition) {
          // Random roaming for idle agents
          if (agent.status === 'idle' && Math.random() < 0.001) {
            const zones = [ZONES.kitchen, ZONES.lounge, ZONES.gym, ZONES.conference];
            const randomZone = zones[Math.floor(Math.random() * zones.length)];
            return {
              ...agent,
              targetPosition: {
                x: randomZone.x + Math.random() * randomZone.width,
                y: randomZone.y + Math.random() * randomZone.height,
              },
              activity: ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)],
            };
          }
          return agent;
        }

        // Move towards target
        const dx = agent.targetPosition.x - agent.position.x;
        const dy = agent.targetPosition.y - agent.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 2) {
          return { ...agent, targetPosition: null, position: agent.targetPosition };
        }

        const speed = 1.5;
        const moveX = (dx / distance) * speed;
        const moveY = (dy / distance) * speed;

        return {
          ...agent,
          position: {
            x: agent.position.x + moveX,
            y: agent.position.y + moveY,
          },
        };
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const workingCount = agents.filter(a => a.status === 'working').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;

  return (
    <div className="w-full h-full bg-[#1a1a2e] relative overflow-hidden">
      {/* Header Stats */}
      <div className="absolute top-4 left-4 z-20 flex gap-4">
        <div className="bg-[#16213e]/90 backdrop-blur border border-[#0f3460] rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-[#e94560]" />
            <span className="text-[#eaeaea] text-sm font-mono">{workingCount} Working</span>
          </div>
        </div>
        <div className="bg-[#16213e]/90 backdrop-blur border border-[#0f3460] rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-[#ffd700]" />
            <span className="text-[#eaeaea] text-sm font-mono">{idleCount} Idle</span>
          </div>
        </div>
        <div className="bg-[#16213e]/90 backdrop-blur border border-[#0f3460] rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00d9ff]" />
            <span className="text-[#eaeaea] text-sm font-mono">{agents.length} Total</span>
          </div>
        </div>
      </div>

      {/* Pixel Office Canvas */}
      <div 
        ref={containerRef}
        className="relative w-full h-full"
        style={{ 
          backgroundImage: `
            linear-gradient(rgba(15, 52, 96, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 52, 96, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        {/* Kitchen Area */}
        <div 
          className="absolute border-2 border-[#8b4513] bg-[#3d2817]/80 rounded-lg"
          style={{ 
            left: ZONES.kitchen.x, 
            top: ZONES.kitchen.y, 
            width: ZONES.kitchen.width, 
            height: ZONES.kitchen.height 
          }}
        >
          <div className="absolute -top-6 left-2 flex items-center gap-1">
            <Coffee className="w-4 h-4 text-[#8b4513]" />
            <span className="text-[10px] text-[#8b4513] font-mono">{ZONES.kitchen.label}</span>
          </div>
          {/* Pixel coffee machine */}
          <div className="absolute top-2 left-2 w-8 h-10 bg-[#4a4a4a] rounded" />
          <div className="absolute top-4 left-10 w-6 h-6 bg-[#5c4033] rounded" />
        </div>

        {/* Lounge Area */}
        <div 
          className="absolute border-2 border-[#4a7c59] bg-[#2d4a3e]/80 rounded-lg"
          style={{ 
            left: ZONES.lounge.x, 
            top: ZONES.lounge.y, 
            width: ZONES.lounge.width, 
            height: ZONES.lounge.height 
          }}
        >
          <div className="absolute -top-6 left-2 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-[#4a7c59]" />
            <span className="text-[10px] text-[#4a7c59] font-mono">{ZONES.lounge.label}</span>
          </div>
          {/* Pixel couches */}
          <div className="absolute top-2 left-2 w-12 h-6 bg-[#5a7c6c] rounded" />
          <div className="absolute top-2 right-2 w-12 h-6 bg-[#5a7c6c] rounded" />
        </div>

        {/* Gym Area */}
        <div 
          className="absolute border-2 border-[#e94560] bg-[#3d1f2e]/80 rounded-lg"
          style={{ 
            left: ZONES.gym.x, 
            top: ZONES.gym.y, 
            width: ZONES.gym.width, 
            height: ZONES.gym.height 
          }}
        >
          <div className="absolute -top-6 left-2 flex items-center gap-1">
            <Dumbbell className="w-4 h-4 text-[#e94560]" />
            <span className="text-[10px] text-[#e94560] font-mono">{ZONES.gym.label}</span>
          </div>
          {/* Pixel weights */}
          <div className="absolute top-2 left-2 w-6 h-6 bg-[#666] rounded-full" />
          <div className="absolute top-4 left-4 w-2 h-2 bg-[#333]" />
        </div>

        {/* Conference Room */}
        <div 
          className="absolute border-2 border-[#ffd700] bg-[#3d3d1f]/80 rounded-lg"
          style={{ 
            left: ZONES.conference.x, 
            top: ZONES.conference.y, 
            width: ZONES.conference.width, 
            height: ZONES.conference.height 
          }}
        >
          <div className="absolute -top-6 left-2 flex items-center gap-1">
            <Users className="w-4 h-4 text-[#ffd700]" />
            <span className="text-[10px] text-[#ffd700] font-mono">{ZONES.conference.label}</span>
          </div>
          {/* Pixel conference table */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-10 bg-[#5c5c3d] rounded" />
        </div>

        {/* Desks */}
        {ZONES.desks.map((desk) => (
          <div
            key={desk.agent}
            className="absolute w-16 h-12 bg-[#2a2a4a] border-2 border-[#4a4a7a] rounded flex items-center justify-center"
            style={{ left: desk.x - 32, top: desk.y - 24 }}
          >
            <span className="text-[8px] text-[#7a7aaa] font-mono">{desk.label.split(' ')[0]}</span>
            {/* Computer monitor */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-6 bg-[#1a1a2e] border border-[#4a4a7a] rounded">
              <div className="w-full h-full bg-[#0f0] opacity-20 animate-pulse" />
            </div>
          </div>
        ))}

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
        <div className="absolute bottom-4 right-4 w-64 bg-[#16213e]/95 backdrop-blur border border-[#0f3460] rounded-lg p-4 z-20">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[#eaeaea] font-bold font-mono">{selectedAgent.name}</h3>
            <button 
              onClick={() => setSelectedAgent(null)}
              className="text-[#7a7aaa] hover:text-[#eaeaea]"
            >
              ×
            </button>
          </div>
          <p className="text-[#7a7aaa] text-sm font-mono mb-2">{selectedAgent.role}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${
              selectedAgent.status === 'working' ? 'bg-[#e94560] animate-pulse' :
              selectedAgent.status === 'idle' ? 'bg-[#ffd700]' : 'bg-[#666]'
            }`} />
            <span className="text-[#eaeaea] text-sm font-mono capitalize">{selectedAgent.status}</span>
          </div>
          <p className="text-[#4a7c59] text-xs font-mono italic">{selectedAgent.activity}</p>
          {selectedAgent.current_task_id && (
            <p className="text-[#00d9ff] text-xs font-mono mt-2">Task: {selectedAgent.current_task_id.slice(0, 8)}...</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[#16213e]/90 backdrop-blur border border-[#0f3460] rounded-lg p-3 z-20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e94560] animate-pulse" />
            <span className="text-[10px] text-[#eaeaea] font-mono">Working</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffd700]" />
            <span className="text-[10px] text-[#eaeaea] font-mono">Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#666]" />
            <span className="text-[10px] text-[#eaeaea] font-mono">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
