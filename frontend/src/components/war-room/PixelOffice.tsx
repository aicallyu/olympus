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

          {/* Common Areas with Furniture */}
          {/* Kitchen - Ambrosia Hall */}
          <div className="absolute rounded-xl border-2 border-[#DAA520]/50 bg-[#1a1510]/90 overflow-hidden"
            style={{ left: 820, top: 60, width: 180, height: 140 }}
            onMouseEnter={() => setHovered('kitchen')}
            onMouseLeave={() => setHovered(null)}>
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[#0d0d14] border border-[#DAA520] rounded text-[10px] font-bold text-[#DAA520]">
              Ambrosia Hall
            </div>
            {/* Kitchen Island */}
            <div className="absolute top-8 left-4 w-24 h-10 bg-[#5C4033] rounded border border-[#8B4513]">
              <div className="absolute top-1 left-1 right-1 h-1 bg-[#2F1B0C]" />
              {/* Stove */}
              <div className="absolute top-3 left-2 w-6 h-4 bg-[#1a1a1a] rounded border border-[#444]">
                <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-[#e94560]/60 rounded-full" />
                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#e94560]/60 rounded-full" />
              </div>
            </div>
            {/* Fridge */}
            <div className="absolute top-8 right-4 w-12 h-20 bg-[#C0C0C0] rounded border border-[#808080]">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#808080]" />
              <div className="absolute top-8 left-1 w-1 h-8 bg-[#808080]" />
            </div>
            {/* Coffee Machine */}
            <div className="absolute bottom-4 left-8 w-8 h-10 bg-[#2F1B0C] rounded border border-[#5C4033]">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1a1a1a] rounded-full" />
            </div>
            {/* Table */}
            <div className="absolute bottom-8 right-8 w-16 h-8 bg-[#5C4033] rounded-full border border-[#8B4513]">
              <div className="absolute -top-3 left-2 w-2 h-6 bg-[#5C4033]" />
              <div className="absolute -top-3 right-2 w-2 h-6 bg-[#5C4033]" />
            </div>
          </div>

          {/* Gym - Arena */}
          <div className="absolute rounded-xl border-2 border-[#e94560]/50 bg-[#1a1010]/90 overflow-hidden"
            style={{ left: 820, top: 220, width: 180, height: 140 }}
            onMouseEnter={() => setHovered('gym')}
            onMouseLeave={() => setHovered(null)}>
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[#0d0d14] border border-[#e94560] rounded text-[10px] font-bold text-[#e94560]">
              Arena
            </div>
            {/* Punching Bag */}
            <div className="absolute top-12 left-8 w-8 h-16 bg-[#8B4513] rounded-full border border-[#5C4033]">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[#666]" />
            </div>
            {/* Bench Press */}
            <div className="absolute top-20 right-4 w-20 h-8">
              <div className="absolute top-3 left-0 right-0 h-2 bg-[#C0C0C0] rounded" />
              <div className="absolute top-0 left-2 w-3 h-6 bg-[#666]" />
              <div className="absolute top-0 right-2 w-3 h-6 bg-[#666]" />
              <div className="absolute top-1 left-0 w-4 h-4 bg-[#333] rounded-full" />
              <div className="absolute top-1 right-0 w-4 h-4 bg-[#333] rounded-full" />
            </div>
            {/* Dumbbell Rack */}
            <div className="absolute bottom-4 left-4 w-12 h-8 bg-[#2F1B0C] rounded border border-[#5C4033]">
              <div className="absolute top-1 left-1 w-3 h-2 bg-[#666] rounded-full" />
              <div className="absolute top-4 left-2 w-4 h-2 bg-[#666] rounded-full" />
            </div>
            {/* Treadmill */}
            <div className="absolute bottom-8 right-8 w-16 h-6 bg-[#1a1a1a] rounded border border-[#444]">
              <div className="absolute top-1 left-1 w-12 h-3 bg-[#333] rounded" />
            </div>
          </div>

          {/* Lounge - Gardens */}
          <div className="absolute rounded-xl border-2 border-[#4ecdc4]/50 bg-[#101a18]/90 overflow-hidden"
            style={{ left: 820, top: 380, width: 180, height: 140 }}
            onMouseEnter={() => setHovered('lounge')}
            onMouseLeave={() => setHovered(null)}>
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[#0d0d14] border border-[#4ecdc4] rounded text-[10px] font-bold text-[#4ecdc4]">
              Gardens
            </div>
            {/* Comfy Couch */}
            <div className="absolute top-8 left-4 w-20 h-10 bg-[#2d4a3e] rounded-lg border border-[#4a7c59]">
              <div className="absolute -top-2 left-0 right-0 h-4 bg-[#3d5a4e] rounded-t-lg" />
            </div>
            {/* Coffee Table */}
            <div className="absolute top-20 left-8 w-12 h-6 bg-[#5C4033] rounded border border-[#8B4513]">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#DAA520]" />
            </div>
            {/* Plant */}
            <div className="absolute bottom-4 right-8 w-8 h-12">
              <div className="absolute bottom-0 w-6 h-4 bg-[#8B4513] rounded mx-auto left-0 right-0" />
              <div className="absolute bottom-3 left-1 w-3 h-6 bg-[#32CD32] rounded-full" />
              <div className="absolute bottom-3 right-1 w-3 h-6 bg-[#32CD32] rounded-full" />
              <div className="absolute bottom-5 left-2 w-4 h-5 bg-[#228B22] rounded-full" />
            </div>
            {/* Armchair */}
            <div className="absolute top-12 right-4 w-12 h-12 bg-[#3d5a4e] rounded-lg border border-[#4a7c59]">
              <div className="absolute -top-1 left-0 right-0 h-3 bg-[#4a7c59] rounded-t-lg" />
            </div>
          </div>

          {/* War Room */}
          <div className="absolute rounded-xl border-2 border-[#ffd700]/50 bg-[#1a1a10]/90 overflow-hidden"
            style={{ left: 820, top: 540, width: 180, height: 120 }}
            onMouseEnter={() => setHovered('warRoom')}
            onMouseLeave={() => setHovered(null)}>
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[#0d0d14] border border-[#ffd700] rounded text-[10px] font-bold text-[#ffd700]">
              War Room
            </div>
            {/* Conference Table */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-28 h-16 bg-[#5C4033] rounded-lg border-2 border-[#8B4513]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-12 bg-[#3d2817] rounded" />
            </div>
            {/* Seats around table */}
            <div className="absolute top-6 left-4 w-6 h-6 bg-[#4a4a4a] rounded" />
            <div className="absolute top-6 right-4 w-6 h-6 bg-[#4a4a4a] rounded" />
            <div className="absolute bottom-6 left-4 w-6 h-6 bg-[#4a4a4a] rounded" />
            <div className="absolute bottom-6 right-4 w-6 h-6 bg-[#4a4a4a] rounded" />
            {/* Map/Screen on wall */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-2 bg-[#00d9ff]/30 rounded" />
          </div>

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
