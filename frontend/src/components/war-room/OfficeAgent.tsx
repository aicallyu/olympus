import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'offline';
  type: 'ai' | 'human';
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  state: string;
}

interface Theme {
  primary: string;
  secondary: string;
  glow: string;
}

interface Props {
  agent: Agent;
  theme: Theme;
  isHovered: boolean;
  onHover: () => void;
}

// God accessories for each agent
const GOD_ACCESSORIES: Record<string, { crown?: boolean; helmet?: boolean; wings?: boolean; staff?: boolean; weapon?: string }> = {
  ARGOS: { crown: true, staff: true },
  ATLAS: { helmet: true },
  HERCULOS: { helmet: true, weapon: 'sword' },
  ATHENA: { helmet: true, weapon: 'spear' },
  APOLLO: { staff: true },
  PROMETHEUS: {},
  HERMES: { wings: true },
  Claude: { staff: true },
  Juan: { crown: true },
  Nathanael: {},
};

export function OfficeAgent({ agent, theme, isHovered, onHover }: Props) {
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [walkCycle, setWalkCycle] = useState(0);
  const acc = GOD_ACCESSORIES[agent.name] || {};

  useEffect(() => {
    if (agent.targetPosition) {
      const dx = agent.targetPosition.x - agent.position.x;
      if (dx > 2) setFacing('right');
      else if (dx < -2) setFacing('left');
      
      const interval = setInterval(() => setWalkCycle(c => (c + 1) % 4), 120);
      return () => clearInterval(interval);
    } else {
      setWalkCycle(0);
    }
  }, [agent.targetPosition, agent.position]);

  const isMoving = !!agent.targetPosition;
  const isWorking = agent.state === 'working';

  // Walking animation offsets
  const bobY = isMoving ? Math.sin(walkCycle * Math.PI / 2) * 3 : 0;
  const legOffset = isMoving ? Math.sin(walkCycle * Math.PI / 2) * 4 : 0;

  return (
    <div
      className="absolute z-50 cursor-pointer transition-transform duration-200"
      style={{
        left: agent.position.x - 18,
        top: agent.position.y - 45 + bobY,
        width: 36,
        height: 55,
        transform: isHovered ? 'scale(1.25)' : 'scale(1)',
        filter: isHovered ? `drop-shadow(0 0 12px ${theme.glow})` : 'none',
      }}
      onMouseEnter={onHover}
    >
      <div style={{ transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}>
        
        {/* Aura */}
        <div className="absolute -inset-3 rounded-full opacity-50 animate-pulse"
          style={{ 
            background: `radial-gradient(circle, ${theme.primary}30 0%, transparent 70%)`,
            animationDuration: '2s'
          }}
        />

        {/* Status Dot */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <div className={`w-2.5 h-2.5 rounded-full ${isWorking ? 'bg-[#e94560]' : isMoving ? 'bg-[#00d9ff]' : 'bg-[#ffd700]'}`}
            style={{ boxShadow: `0 0 8px ${isWorking ? '#e94560' : isMoving ? '#00d9ff' : '#ffd700'}` }} />
        </div>

        {/* Crown */}
        {acc.crown && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <svg width="20" height="10" viewBox="0 0 20 10">
              <path d="M0 10 L5 2 L10 7 L15 2 L20 10 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth="1"/>
              <circle cx="10" cy="4" r="2.5" fill={theme.secondary}/>
            </svg>
          </div>
        )}

        {/* Helmet */}
        {acc.helmet && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-3 rounded-t"
            style={{ backgroundColor: theme.secondary, border: `1.5px solid ${theme.primary}` }} />
        )}

        {/* Wings */}
        {acc.wings && (
          <>
            <div className="absolute top-0 -left-3 w-3 h-5 bg-[#DAA520]/70 rounded-full animate-pulse" 
              style={{ animationDuration: '0.4s' }} />
            <div className="absolute top-0 -right-3 w-3 h-5 bg-[#DAA520]/70 rounded-full animate-pulse" 
              style={{ animationDuration: '0.4s', animationDelay: '0.2s' }} />
          </>
        )}

        {/* Head */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-5 rounded"
          style={{ 
            backgroundColor: theme.primary,
            border: `2px solid ${theme.secondary}`,
            boxShadow: `0 0 6px ${theme.glow}`,
          }}>
          {/* Eyes */}
          <div className="absolute top-1.5 left-1 w-1 h-1 bg-[#0a0a12] rounded-full" />
          <div className="absolute top-1.5 right-1 w-1 h-1 bg-[#0a0a12] rounded-full" />
        </div>

        {/* Body */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-6 h-7 rounded-sm"
          style={{ 
            backgroundColor: theme.primary,
            border: `2px solid ${theme.secondary}`,
            boxShadow: `0 0 8px ${theme.glow}`,
          }}>
          {/* Toga line for AI */}
          {agent.type === 'ai' && (
            <div className="absolute left-1 top-0 bottom-0 w-0.5" style={{ backgroundColor: theme.secondary }} />
          )}
          {/* Tie for humans */}
          {agent.type === 'human' && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1 w-2 h-4 bg-[#1a3a5c] rounded-sm" />
          )}
        </div>

        {/* Arms */}
        <div className="absolute top-6 w-2.5 h-5 rounded-sm"
          style={{ 
            left: '-4px',
            backgroundColor: theme.secondary,
            transform: isMoving ? `translateY(${-legOffset}px)` : 'none',
            transition: 'transform 0.1s',
          }}
        />
        <div className="absolute top-6 w-2.5 h-5 rounded-sm"
          style={{ 
            right: '-4px',
            backgroundColor: theme.secondary,
            transform: isMoving ? `translateY(${legOffset}px)` : 'none',
            transition: 'transform 0.1s',
          }}
        />

        {/* Weapon */}
        {acc.weapon === 'sword' && (
          <div className="absolute top-7 -right-5 w-1.5 h-10 rounded-full bg-[#C0C0C0]"
            style={{ transform: 'rotate(20deg)' }} />
        )}
        {acc.weapon === 'spear' && (
          <div className="absolute -top-3 -right-4 w-1 h-14 rounded-full"
            style={{ backgroundColor: theme.primary }} />
        )}

        {/* Staff */}
        {acc.staff && (
          <div className="absolute top-5 -right-5 w-1.5 h-12 rounded-full"
            style={{ backgroundColor: theme.secondary }}>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" 
              style={{ backgroundColor: theme.primary }} />
          </div>
        )}

        {/* Legs */}
        <div className="absolute top-12 w-2 h-6 rounded-sm"
          style={{ 
            left: '3px',
            backgroundColor: theme.secondary,
            transform: isMoving ? `translateY(${legOffset}px)` : 'none',
            transition: 'transform 0.1s',
          }}
        />
        <div className="absolute top-12 w-2 h-6 rounded-sm"
          style={{ 
            right: '3px',
            backgroundColor: theme.secondary,
            transform: isMoving ? `translateY(${-legOffset}px)` : 'none',
            transition: 'transform 0.1s',
          }}
        />
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-[#0a0a12] border-2 rounded-xl px-4 py-2 whitespace-nowrap z-50"
          style={{ borderColor: theme.primary }}>
          <div className="text-xs text-[#eaeaea] font-bold">{agent.name}</div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: theme.primary }}>{agent.state}</div>
          <div className="text-[9px] text-[#7a7aaa]">{agent.type === 'ai' ? 'Olymp God' : 'Human'}</div>
        </div>
      )}

      {/* Name label when moving */}
      {isMoving && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
          <span className="text-[9px] text-[#7a7aaa] bg-[#0a0a12]/90 px-2 py-0.5 rounded-full">
            {agent.name}
          </span>
        </div>
      )}
    </div>
  );
}
