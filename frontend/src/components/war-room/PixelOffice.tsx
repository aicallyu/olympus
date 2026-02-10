import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OfficeAgent } from './OfficeAgent';

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'offline';
  type: 'ai' | 'human';
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  state: 'working' | 'idle' | 'roaming';
}

const AGENT_THEMES: Record<string, { primary: string; secondary: string; glow: string }> = {
  ARGOS: { primary: '#FFD700', secondary: '#B8860B', glow: 'rgba(255,215,0,0.4)' },
  ATLAS: { primary: '#00CED1', secondary: '#008B8B', glow: 'rgba(0,206,209,0.4)' },
  HERCULOS: { primary: '#FF4500', secondary: '#DC143C', glow: 'rgba(255,69,0,0.4)' },
  ATHENA: { primary: '#E8E8E8', secondary: '#A0A0A0', glow: 'rgba(232,232,232,0.4)' },
  APOLLO: { primary: '#FF1493', secondary: '#C71585', glow: 'rgba(255,20,147,0.4)' },
  PROMETHEUS: { primary: '#32CD32', secondary: '#228B22', glow: 'rgba(50,205,50,0.4)' },
  HERMES: { primary: '#DAA520', secondary: '#8B4513', glow: 'rgba(218,165,32,0.4)' },
  Claude: { primary: '#9370DB', secondary: '#8A2BE2', glow: 'rgba(147,112,219,0.4)' },
  Juan: { primary: '#4169E1', secondary: '#0000CD', glow: 'rgba(65,105,225,0.4)' },
  Nathanael: { primary: '#20B2AA', secondary: '#008080', glow: 'rgba(32,178,170,0.4)' },
};

// Workstation Component - Premium Desk Setup
function Workstation({ x, y, theme, monitors = 1 }: { x: number; y: number; theme: any; monitors?: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Desk Shadow */}
      <div className="absolute top-8 left-2 w-28 h-16 bg-black/30 rounded-lg blur-sm" />
      
      {/* Office Chair (behind desk) */}
      <div className="absolute -top-6 left-8">
        {/* Wheels */}
        <div className="absolute bottom-0 left-1 w-2 h-2 bg-[#333] rounded-full" />
        <div className="absolute bottom-0 right-1 w-2 h-2 bg-[#333] rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#444]" />
        {/* Base */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-4 bg-[#333] rounded" />
        {/* Seat */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-3 bg-[#2a2a2a] rounded" style={{ backgroundColor: theme.secondary }} />
        {/* Backrest */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-8 rounded-lg" style={{ backgroundColor: theme.primary + '60' }} />
        {/* Armrests */}
        <div className="absolute bottom-5 left-0 w-2 h-4 bg-[#444] rounded" />
        <div className="absolute bottom-5 right-0 w-2 h-4 bg-[#444] rounded" />
      </div>

      {/* Desk */}
      <div className="absolute top-4 left-0 w-28 h-14">
        {/* Desk Top */}
        <div className="absolute top-0 left-0 w-full h-3 rounded-sm" style={{ backgroundColor: theme.secondary }} />
        {/* Desk Body */}
        <div className="absolute top-3 left-0 w-full h-10 rounded-b-sm" style={{ backgroundColor: theme.secondary + 'dd' }} />
        {/* Left Drawer */}
        <div className="absolute top-4 left-1 w-6 h-8 rounded-sm" style={{ backgroundColor: theme.secondary }}>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#DAA520]/50" />
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#DAA520]/50" />
        </div>
        {/* Right Drawer */}
        <div className="absolute top-4 right-1 w-6 h-8 rounded-sm" style={{ backgroundColor: theme.secondary }}>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#DAA520]/30" />
        </div>
        {/* Center Space */}
        <div className="absolute top-4 left-8 w-12 h-8 bg-[#1a1510]/50 rounded-sm" />
      </div>

      {/* Monitor(s) */}
      {monitors === 1 ? (
        <div className="absolute -top-8 left-9">
          {/* Stand */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-3 bg-[#333]" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-2 bg-[#444]" />
          {/* Screen Frame */}
          <div className="absolute -top-8 left-0 w-12 h-8 bg-[#1a1a1a] rounded border-2" style={{ borderColor: theme.primary }}>
            {/* Screen Glow */}
            <div className="absolute top-0.5 left-0.5 right-0.5 bottom-0.5 rounded-sm animate-pulse" style={{ backgroundColor: theme.glow }} />
            {/* Screen Content lines */}
            <div className="absolute top-1 left-1 right-1 h-0.5 bg-[#eaeaea]/30" />
            <div className="absolute top-2.5 left-1 w-6 h-0.5 bg-[#eaeaea]/20" />
            <div className="absolute top-4 left-1 w-8 h-0.5 bg-[#eaeaea]/20" />
          </div>
        </div>
      ) : (
        // Triple monitor setup for ARGOS
        <>
          <div className="absolute -top-8 left-2">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-3 bg-[#333]" />
            <div className="absolute -top-8 left-0 w-8 h-6 bg-[#1a1a1a] rounded border" style={{ borderColor: theme.primary }}>
              <div className="absolute inset-0.5 rounded-sm" style={{ backgroundColor: theme.glow }} />
            </div>
          </div>
          <div className="absolute -top-8 left-10">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-3 bg-[#333]" />
            <div className="absolute -top-8 left-0 w-8 h-6 bg-[#1a1a1a] rounded border-2" style={{ borderColor: theme.primary }}>
              <div className="absolute inset-0.5 rounded-sm animate-pulse" style={{ backgroundColor: theme.glow }} />
            </div>
          </div>
          <div className="absolute -top-8 right-2">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-3 bg-[#333]" />
            <div className="absolute -top-8 left-0 w-8 h-6 bg-[#1a1a1a] rounded border" style={{ borderColor: theme.primary }}>
              <div className="absolute inset-0.5 rounded-sm" style={{ backgroundColor: theme.glow }} />
            </div>
          </div>
        </>
      )}

      {/* Keyboard */}
      <div className="absolute top-5 left-10 w-10 h-2 bg-[#333] rounded-sm border border-[#444]">
        <div className="absolute top-0.5 left-0.5 right-0.5 h-0.5 bg-[#555]" />
      </div>

      {/* Mouse */}
      <div className="absolute top-5 right-4 w-2 h-3 bg-[#333] rounded-full border border-[#444]">
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-[#555]" />
      </div>

      {/* Desk Lamp */}
      <div className="absolute -top-2 left-2">
        <div className="absolute bottom-0 w-2 h-2 bg-[#444] rounded" />
        <div className="absolute bottom-1 left-1 w-0.5 h-4 bg-[#666]" />
        <div className="absolute -top-2 left-0 w-3 h-2 bg-[#444] rounded-t-lg" />
        <div className="absolute -top-1 right-0 w-2 h-2 bg-[#FFD700]/40 rounded-full blur-sm" />
      </div>

      {/* Coffee Mug */}
      <div className="absolute top-4 right-8">
        <div className="w-2.5 h-3 bg-[#8B4513] rounded-sm" />
        <div className="absolute top-0.5 -right-1 w-1 h-2 border-2 border-[#8B4513] rounded-r" />
        {/* Steam */}
        <div className="absolute -top-2 left-0.5 w-0.5 h-1.5 bg-white/20 rounded-full animate-pulse" />
      </div>

      {/* Plant */}
      <div className="absolute top-3 left-1">
        <div className="w-2.5 h-2.5 bg-[#5C4033] rounded-sm" />
        <div className="absolute -top-3 left-0.5 w-1.5 h-3 bg-[#228B22] rounded-full" />
        <div className="absolute -top-2 -left-1 w-1.5 h-2 bg-[#32CD32] rounded-full" />
        <div className="absolute -top-2 right-0 w-1 h-2 bg-[#228B22] rounded-full" />
      </div>

      {/* Papers */}
      <div className="absolute top-6 left-6">
        <div className="w-4 h-3 bg-[#f5f5dc] rounded-sm rotate-3" />
        <div className="absolute top-0.5 left-0.5 w-3 h-0.5 bg-[#ccc]" />
        <div className="absolute top-1.5 left-0.5 w-2 h-0.5 bg-[#ccc]" />
      </div>
    </div>
  );
}

// Component Room with Workstation
function AgentRoom({ room, theme }: { room: any; theme: any }) {
  const [hovered, setHovered] = useState(false);
  const monitors = room.name === 'ARGOS' ? 3 : room.name === 'Juan' ? 2 : 1;

  return (
    <div
      className="absolute rounded-xl border-2 transition-all duration-300"
      style={{
        left: room.x, top: room.y, width: room.w, height: room.h,
        borderColor: hovered ? theme.primary : theme.secondary,
        background: `linear-gradient(180deg, ${theme.glow}15 0%, transparent 60%)`,
        boxShadow: hovered ? `0 0 40px ${theme.glow}` : 'inset 0 0 30px rgba(0,0,0,0.5)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Room Label */}
      <div className="absolute -top-3 left-4 px-3 py-1 bg-[#0d0d14] border rounded-lg text-[10px] font-bold uppercase tracking-wider"
        style={{ borderColor: theme.primary, color: theme.primary }}>
        {room.label}
      </div>

      {/* Workstation */}
      <div className="absolute" style={{ left: room.w/2 - 60, top: room.h/2 - 10 }}>
        <Workstation x={0} y={0} theme={theme} monitors={monitors} />
      </div>

      {/* Floor decoration */}
      <div className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${room.w/2}px ${room.h/2 + 20}px, ${theme.glow}20 0%, transparent 60%)`,
        }}
      />
    </div>
  );
}

export function PixelOffice() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const animRef = useRef<number>(0);

  const rooms = [
    { name: 'ARGOS', x: 80, y: 60, w: 200, h: 160, label: 'Throne Room' },
    { name: 'Juan', x: 320, y: 60, w: 180, h: 160, label: 'Executive' },
    { name: 'ATLAS', x: 40, y: 260, w: 180, h: 150, label: 'Workshop' },
    { name: 'HERCULOS', x: 240, y: 260, w: 180, h: 150, label: 'Forge' },
    { name: 'Claude', x: 440, y: 260, w: 180, h: 150, label: 'Library' },
    { name: 'Nathanael', x: 640, y: 260, w: 160, h: 150, label: 'Frontend' },
    { name: 'ATHENA', x: 40, y: 440, w: 160, h: 150, label: 'Temple' },
    { name: 'PROMETHEUS', x: 220, y: 440, w: 180, h: 150, label: 'Lab' },
    { name: 'APOLLO', x: 420, y: 440, w: 160, h: 150, label: 'Studio' },
    { name: 'HERMES', x: 600, y: 440, w: 160, h: 150, label: 'Archive' },
  ];

  // Initialize agents
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('agents').select('*').order('name');
      if (data) {
        const roomMap: Record<string, any> = {};
        rooms.forEach(r => roomMap[r.name] = r);
        
        const withPos = data.map((a: any) => {
          const room = roomMap[a.name] || rooms[0];
          return {
            ...a,
            position: { x: room.x + room.w/2, y: room.y + room.h/2 + 20 },
            targetPosition: null,
            state: a.status === 'working' ? 'working' : 'idle',
          };
        });
        setAgents(withPos);
      }
    };
    load();
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAgents(prev => prev.map(agent => {
        if (agent.state === 'working') return agent;
        
        if (!agent.targetPosition && Math.random() < 0.008) {
          const room = rooms.find(r => r.name === agent.name) || rooms[0];
          return {
            ...agent,
            targetPosition: {
              x: room.x + 40 + Math.random() * (room.w - 80),
              y: room.y + 40 + Math.random() * (room.h - 60)
            },
            state: 'roaming' as const
          };
        }

        if (agent.targetPosition) {
          const dx = agent.targetPosition.x - agent.position.x;
          const dy = agent.targetPosition.y - agent.position.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 5) return { ...agent, targetPosition: null, state: 'idle' as const };
          
          const speed = 0.8;
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
    <div className="w-full h-full bg-[#0a0a12] relative overflow-hidden select-none font-mono">
      {/* Temple Background */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(218,165,32,0.2) 1px, transparent 1px), linear-gradient(rgba(218,165,32,0.2) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Decorative Columns */}
      {[60, 260, 460, 660, 860].map((x, i) => (
        <div key={i} className="absolute top-0 bottom-0 w-8 opacity-15"
          style={{ 
            left: x,
            background: 'linear-gradient(90deg, #DAA520 0%, #8B4513 50%, #DAA520 100%)'
          }}
        />
      ))}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#0a0a12] to-transparent z-20 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#FFD700]/20 flex items-center justify-center border border-[#FFD700]/50">
            <span className="text-[#FFD700] text-lg">⚡</span>
          </div>
          <span className="text-[#FFD700] text-lg font-bold tracking-[0.2em]">OLYMP</span>
        </div>
        <div className="flex gap-6 text-xs">
          <span className="text-[#e94560] font-bold">{working} WORKING</span>
          <span className="text-[#ffd700]">{agents.length - working} IDLE</span>
        </div>
      </div>

      {/* Main Office Area */}
      <div className="absolute inset-0 pt-20 pb-24 overflow-auto">
        <div className="relative w-[1020px] h-[650px] mx-auto">
          
          {/* Agent Rooms */}
          {rooms.map(room => (
            <AgentRoom
              key={room.name}
              room={room}
              theme={AGENT_THEMES[room.name]}
            />
          ))}

          {/* Kitchen - Ambrosia Hall */}
          <div className="absolute rounded-xl border-2 border-[#DAA520]/50 bg-[#1a1510]/95 overflow-hidden"
            style={{ left: 820, top: 60, width: 180, height: 140 }}
            onMouseEnter={() => setHovered('kitchen')}
            onMouseLeave={() => setHovered(null)}>
            <div className="absolute -top-3 left-4 px-3 py-1 bg-[#0a0a12] border border-[#DAA520] rounded-lg text-[10px] font-bold text-[#DAA520]">
              Ambrosia Hall
            </div>
            {/* Kitchen Counter */}
            <div className="absolute bottom-4 left-4 right-4 h-16 bg-[#5C4033] rounded-lg border border-[#8B4513]">
              {/* Sink */}
              <div className="absolute top-2 left-4 w-10 h-6 bg-[#2a2a2a] rounded border border-[#444]">
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-4 bg-[#1a1a1a] rounded" />
              </div>
              {/* Stove */}
              <div className="absolute top-2 left-20 w-12 h-6 bg-[#1a1a1a] rounded border border-[#444]">
                <div className="absolute top-1 left-1 w-4 h-1 bg-[#e94560]/60 rounded-full" />
                <div className="absolute top-3 left-1 w-4 h-1 bg-[#e94560]/60 rounded-full" />
              </div>
              {/* Fridge */}
              <div className="absolute -top-12 right-2 w-10 h-20 bg-[#C0C0C0] rounded border border-[#808080]">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#808080]" />
                <div className="absolute top-8 left-2 w-0.5 h-8 bg-[#808080]" />
              </div>
              {/* Coffee Machine */}
              <div className="absolute top-2 right-16 w-6 h-8 bg-[#2F1B0C] rounded border border-[#5C4033]">
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1a1a] rounded-full" />
                <div className="absolute bottom-1 left-1 w-4 h-2 bg-white/20 rounded" />
              </div>
            </div>
            {/* Bar Stools */}
            <div className="absolute bottom-20 left-8">
              <div className="w-6 h-6 bg-[#5C4033] rounded-full" />
              <div className="absolute -top-4 left-2 w-2 h-6 bg-[#444]" />
            </div>
            <div className="absolute bottom-20 left-20">
              <div className="w-6 h-6 bg-[#5C4033] rounded-full" />
              <div className="absolute -top-4 left-2 w-2 h-6 bg-[#444]" />
            </div>
          </div>

          {/* Gym - Arena */}
          <div className="absolute rounded-xl border-2 border-[#e94560]/50 bg-[#1a1010]/95 overflow-hidden"
            style={{ left: 820, top: 220, width: 180, height: 140 }}
            onMouseEnter={() => setHovered('gym')}
            onMouseLeave={() => setHovered(null)}>
            <div className="absolute -top-3 left-4 px-3 py-1 bg-[#0a0a12] border border-[#e94560] rounded-lg text-[10px] font-bold text-[#e94560]">
              Arena
            </div>
            {/* Mirror Wall */}
            <div className="absolute top-4 left-4 right-4 h-16 bg-[#1a1a2e]/50 rounded border border-[#444]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#4ecdc4]/10 to-transparent" />
            </div>
            {/* Punching Bag */}
            <div className="absolute top-16 left-8 w-8 h-16 bg-[#8B4513] rounded-full border border-[#5C4033]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[#666]" />
            </div>
            {/* Weight Bench */}
            <div className="absolute bottom-8 right-4 w-20 h-8">
              <div className="absolute top-3 left-0 right-0 h-2 bg-[#666] rounded" />
              <div className="absolute top-0 left-2 w-3 h-6 bg-[#444]" />
              <div className="absolute top-0 right-2 w-3 h-6 bg-[#444]" />
              <div className="absolute top-1 left-0 w-4 h-4 bg-[#333] rounded-full" />
              <div className="absolute top-1 right-0 w-4 h-4 bg-[#333] rounded-full" />
            </div>
            {/* Dumbbell Rack */}
            <div className="absolute bottom-4 left-4 w-14 h-8 bg-[#2F1B0C] rounded border border-[#5C4033]">
              <div className="absolute top-1 left-1 w-4 h-2 bg-[#666] rounded-full" />
              <div className="absolute top-4 left-3 w-5 h-2 bg-[#666] rounded-full" />
              <div className="absolute top-2 right-1 w-3 h-2 bg-[#666] rounded-full" />
            </div>
          </div>

          {/* Lounge - Gardens */}
          <div className="absolute rounded-xl border-2 border-[#4ecdc4]/50 bg-[#101a18]/95 overflow-hidden"
            style={{ left: 820, top: 380, width: 180, height: 140 }}
            onMouseEnter={() => setHovered('lounge')}
            onMouseLeave={() => setHovered(null)}>
            <div className="absolute -top-3 left-4 px-3 py-1 bg-[#0a0a12] border border-[#4ecdc4] rounded-lg text-[10px] font-bold text-[#4ecdc4]">
              Gardens
            </div>
            {/* Large Sofa */}
            <div className="absolute top-8 left-4 w-20 h-12 bg-[#2d4a3e] rounded-lg border border-[#4a7c59]">
              <div className="absolute -top-2 left-0 right-0 h-4 bg-[#3d5a4e] rounded-t-lg" />
              <div className="absolute top-2 left-2 right-2 h-6 bg-[#1a2e24] rounded" />
            </div>
            {/* Armchair */}
            <div className="absolute top-10 right-4 w-12 h-14 bg-[#3d5a4e] rounded-lg border border-[#4a7c59]">
              <div className="absolute -top-1 left-0 right-0 h-3 bg-[#4a7c59] rounded-t-lg" />
            </div>
            {/* Coffee Table */}
            <div className="absolute bottom-8 left-8 w-16 h-8 bg-[#5C4033] rounded-lg border border-[#8B4513]">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#DAA520] rounded" />
            </div>
            {/* Large Plant */}
            <div className="absolute bottom-4 right-8 w-10 h-16">
              <div className="absolute bottom-0 w-8 h-6 bg-[#5C4033] rounded-lg mx-auto left-0 right-0" />
              <div className="absolute bottom-5 left-0 w-5 h-8 bg-[#228B22] rounded-full" />
              <div className="absolute bottom-6 right-0 w-4 h-7 bg-[#32CD32] rounded-full" />
              <div className="absolute bottom-10 left-2 w-6 h-6 bg-[#228B22] rounded-full" />
            </div>
          </div>

          {/* War Room */}
          <div className="absolute rounded-xl border-2 border-[#ffd700]/50 bg-[#1a1a10]/95 overflow-hidden"
            style={{ left: 820, top: 540, width: 180, height: 120 }}
            onMouseEnter={() => setHovered('warRoom')}
            onMouseLeave={() => setHovered(null)}>
            <div className="absolute -top-3 left-4 px-3 py-1 bg-[#0a0a12] border border-[#ffd700] rounded-lg text-[10px] font-bold text-[#ffd700]">
              War Room
            </div>
            {/* Large Conference Table */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-16 bg-[#5C4033] rounded-xl border-2 border-[#8B4513]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-12 bg-[#3d2817] rounded-lg" />
            </div>
            {/* Chairs */}
            {[[8, 6], [40, 6], [72, 6], [104, 6], [8, 80], [40, 80], [72, 80], [104, 80]].map(([cx, cy], i) => (
              <div key={i} className="absolute w-6 h-6 bg-[#4a4a4a] rounded border border-[#666]"
                style={{ left: 20 + cx, top: cy }} />
            ))}
            {/* Wall Screens */}
            <div className="absolute top-2 left-4 w-16 h-1 bg-[#00d9ff]/40 rounded" />
            <div className="absolute top-2 right-4 w-16 h-1 bg-[#00d9ff]/40 rounded" />
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
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a12] via-[#0a0a12] to-transparent z-30">
        <div className="absolute bottom-4 left-4 right-4 flex gap-3 overflow-x-auto pb-2">
          {agents.map(a => (
            <div key={a.id} 
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-[#0a0a12]/90 whitespace-nowrap"
              style={{ 
                borderColor: AGENT_THEMES[a.name]?.primary + '40',
                boxShadow: `0 0 15px ${AGENT_THEMES[a.name]?.glow}30`
              }}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                a.state === 'working' ? 'bg-[#e94560] animate-pulse' : 
                a.state === 'roaming' ? 'bg-[#00d9ff]' : 'bg-[#ffd700]'
              }`} />
              <span className="text-[11px] text-[#eaeaea] font-bold">{a.name}</span>
              <span className="text-[9px] text-[#7a7aaa] uppercase tracking-wider">{a.state}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
