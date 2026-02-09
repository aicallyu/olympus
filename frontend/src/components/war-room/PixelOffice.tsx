import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OfficeAgent } from './OfficeAgent';
import { Crown } from 'lucide-react';

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
  activity: string;
  state: 'working' | 'idle' | 'roaming';
}

const AGENT_THEMES: Record<string, { 
  primary: string; 
  secondary: string; 
  accent: string;
  glow: string;
}> = {
  ARGOS: { primary: '#FFD700', secondary: '#B8860B', accent: '#FFA500', glow: 'rgba(255,215,0,0.5)' },
  ATLAS: { primary: '#00CED1', secondary: '#008B8B', accent: '#5F9EA0', glow: 'rgba(0,206,209,0.5)' },
  HERCULOS: { primary: '#FF4500', secondary: '#DC143C', accent: '#FF6347', glow: 'rgba(255,69,0,0.5)' },
  ATHENA: { primary: '#E8E8E8', secondary: '#C0C0C0', accent: '#FFFFFF', glow: 'rgba(232,232,232,0.5)' },
  APOLLO: { primary: '#FF1493', secondary: '#C71585', accent: '#FF69B4', glow: 'rgba(255,20,147,0.5)' },
  PROMETHEUS: { primary: '#32CD32', secondary: '#228B22', accent: '#00FF7F', glow: 'rgba(50,205,50,0.5)' },
  HERMES: { primary: '#DAA520', secondary: '#8B4513', accent: '#CD853F', glow: 'rgba(218,165,32,0.5)' },
  Claude: { primary: '#9370DB', secondary: '#8A2BE2', accent: '#BA55D3', glow: 'rgba(147,112,219,0.5)' },
  Juan: { primary: '#4169E1', secondary: '#0000CD', accent: '#1E90FF', glow: 'rgba(65,105,225,0.5)' },
  Nathanael: { primary: '#20B2AA', secondary: '#008080', accent: '#48D1CC', glow: 'rgba(32,178,170,0.5)' },
};

const TEMPLE_ROOMS: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  ARGOS: { x: 80, y: 60, w: 200, h: 160, label: 'Throne' },
  Juan: { x: 320, y: 60, w: 180, h: 160, label: 'Executive' },
  ATLAS: { x: 40, y: 260, w: 180, h: 150, label: 'Workshop' },
  HERCULOS: { x: 240, y: 260, w: 180, h: 150, label: 'Forge' },
  Claude: { x: 440, y: 260, w: 180, h: 150, label: 'Library' },
  Nathanael: { x: 640, y: 260, w: 160, h: 150, label: 'Frontend' },
  ATHENA: { x: 40, y: 440, w: 160, h: 150, label: 'Temple' },
  PROMETHEUS: { x: 220, y: 440, w: 180, h: 150, label: 'Lab' },
  APOLLO: { x: 420, y: 440, w: 160, h: 150, label: 'Studio' },
  HERMES: { x: 600, y: 440, w: 160, h: 150, label: 'Archive' },
  kitchen: { x: 820, y: 60, w: 180, h: 140, label: 'Ambrosia' },
  lounge: { x: 820, y: 220, w: 180, h: 140, label: 'Gardens' },
  gym: { x: 820, y: 380, w: 180, h: 140, label: 'Arena' },
  warRoom: { x: 820, y: 540, w: 180, h: 120, label: 'War Room' },
};

export function PixelOffice() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const animRef = useRef<number>(0);

  // Initialize agents
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('agents')
        .select('*')
        .order('name');

      if (data) {
        const withPos = data.map((a: any) => {
          const room = TEMPLE_ROOMS[a.name] || TEMPLE_ROOMS.ATLAS;
          return {
            ...a,
            position: { x: room.x + room.w/2, y: room.y + room.h/2 },
            targetPosition: null,
            currentTask: null,
            activity: a.status === 'working' ? 'Working' : 'Idle',
            state: a.status === 'working' ? 'working' : 'idle',
          };
        });
        setAgents(withPos);
      }
    };
    load();
  }, []);

  // Animation loop - smooth roaming for idle agents
  useEffect(() => {
    let lastTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setAgents(prev => prev.map(agent => {
        // If working, stay still
        if (agent.state === 'working') return agent;

        // If no target, pick random wander point occasionally
        if (!agent.targetPosition && Math.random() < 0.005) {
          const room = TEMPLE_ROOMS[agent.name] || TEMPLE_ROOMS.ATLAS;
          // Wander within room bounds
          const target = {
            x: room.x + 30 + Math.random() * (room.w - 60),
            y: room.y + 30 + Math.random() * (room.h - 60)
          };
          return { ...agent, targetPosition: target, state: 'roaming' as const };
        }

        // If has target, move towards it
        if (agent.targetPosition) {
          const dx = agent.targetPosition.x - agent.position.x;
          const dy = agent.targetPosition.y - agent.position.y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          if (dist < 5) {
            return { ...agent, targetPosition: null, state: 'idle' as const };
          }

          const speed = 40 * dt; // pixels per second
          return {
            ...agent,
            position: {
              x: agent.position.x + (dx/dist) * speed,
              y: agent.position.y + (dy/dist) * speed,
            }
          };
        }

        return agent;
      }));

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const working = agents.filter(a => a.state === 'working').length;

  return (
    <div className="w-full h-full bg-[#0d0d14] relative overflow-hidden select-none">
      {/* Temple Background Pattern */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(218,165,32,0.15) 1px, transparent 1px),
            linear-gradient(rgba(218,165,32,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Decorative Columns */}
      {[100, 300, 500, 700, 900].map((x, i) => (
        <div key={i} className="absolute top-0 bottom-0 w-6 opacity-20"
          style={{ 
            left: x,
            background: 'linear-gradient(90deg, #DAA520 0%, #8B4513 50%, #DAA520 100%)'
          }}
        />
      ))}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-[#0d0d14] to-transparent z-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-[#FFD700]" />
          <span className="text-[#FFD700] text-sm font-bold tracking-widest">OLYMP</span>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-[#e94560]">{working} Working</span>
          <span className="text-[#ffd700]">{agents.length - working} Idle</span>
        </div>
      </div>

      {/* Temple Floor */}
      <div className="absolute inset-0 pt-14 pb-20 overflow-auto">
        <div className="relative w-[1050px] h-[700px] mx-auto">
          
          {/* Rooms */}
          {Object.entries(TEMPLE_ROOMS).map(([name, room]) => {
            const isAgent = !!AGENT_THEMES[name];
            const theme = AGENT_THEMES[name] || { primary: '#DAA520', secondary: '#8B4513', accent: '#CD853F', glow: 'rgba(218,165,32,0.3)' };
            const isHovered = hovered === name;

            return (
              <div
                key={name}
                className="absolute rounded-xl border-2 transition-all duration-300"
                style={{
                  left: room.x,
                  top: room.y,
                  width: room.w,
                  height: room.h,
                  borderColor: isHovered ? theme.primary : theme.secondary,
                  background: `linear-gradient(180deg, ${theme.glow}20 0%, transparent 60%)`,
                  boxShadow: isHovered ? `0 0 30px ${theme.glow}` : 'inset 0 0 20px rgba(0,0,0,0.5)',
                }}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Room Label */}
                <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[#0d0d14] border rounded text-[10px] font-bold uppercase"
                  style={{ borderColor: theme.primary, color: theme.primary }}>
                  {room.label}
                </div>

                {/* Room Content based on type */}
                {name === 'ARGOS' && (
                  <div className="absolute inset-4 flex items-center justify-center">
                    <div className="w-20 h-16 bg-[#FFD700]/20 rounded-lg border-2 border-[#FFD700]/50 flex items-center justify-center">
                      <Crown className="w-10 h-10 text-[#FFD700]/60" />
                    </div>
                  </div>
                )}
                {name === 'HERCULOS' && (
                  <div className="absolute inset-4 flex items-end justify-center gap-2">
                    <div className="w-6 h-12 bg-[#FF4500]/30 rounded border border-[#FF4500]/50" />
                    <div className="w-8 h-8 bg-[#FF4500]/20 rounded-full border border-[#FF4500]/40" />
                  </div>
                )}
                {name === 'Claude' && (
                  <div className="absolute inset-4 flex items-center justify-center">
                    <div className="w-16 h-16 bg-[#9370DB]/20 rounded-full border-2 border-[#9370DB]/50" />
                  </div>
                )}

                {/* Glow effect for agent rooms */}
                {isAgent && (
                  <div className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, ${theme.glow}30 0%, transparent 70%)`,
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Agents */}
          {agents.map(agent => (
            <OfficeAgent
              key={agent.id}
              agent={agent}
              theme={AGENT_THEMES[agent.name]}
              isHovered={hovered === agent.name}
              onHover={() => setHovered(agent.name)}
            />
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0d0d14] via-[#0d0d14] to-transparent z-30">
        <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto">
          {agents.map(a => (
            <div key={a.id} 
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-[#0d0d14]/80 whitespace-nowrap"
              style={{ 
                borderColor: AGENT_THEMES[a.name]?.primary + '40',
                boxShadow: `0 0 10px ${AGENT_THEMES[a.name]?.glow}20`
              }}>
              <div className={`w-2 h-2 rounded-full ${
                a.state === 'working' ? 'bg-[#e94560] animate-pulse' : 
                a.state === 'roaming' ? 'bg-[#00d9ff]' : 'bg-[#ffd700]'
              }`} />
              <span className="text-[10px] text-[#eaeaea] font-bold">{a.name}</span>
              <span className="text-[9px] text-[#7a7aaa] uppercase">{a.state}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
