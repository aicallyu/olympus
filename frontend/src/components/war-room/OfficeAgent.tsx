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
  accent: string;
  glow: string;
}

interface Props {
  agent: Agent;
  theme: Theme;
  isHovered: boolean;
  onHover: () => void;
}

// Detailed pixel art sprites for each Olymp god
const GOD_DESIGNS: Record<string, {
  crown?: boolean;
  helmet?: boolean;
  wings?: boolean;
  staff?: boolean;
  aura?: string;
  weapon?: 'sword' | 'spear' | 'none';
}> = {
  ARGOS: { crown: true, aura: '#FFD700', weapon: 'spear' },
  ATLAS: { helmet: true, aura: '#00CED1' },
  HERCULOS: { helmet: true, aura: '#FF4500', weapon: 'sword' },
  ATHENA: { helmet: true, aura: '#E8E8E8', weapon: 'spear' },
  APOLLO: { aura: '#FF1493', staff: true },
  PROMETHEUS: { aura: '#32CD32' },
  HERMES: { wings: true, aura: '#DAA520' },
  Claude: { aura: '#9370DB', staff: true },
  Juan: { crown: true, aura: '#4169E1' },
  Nathanael: { aura: '#20B2AA' },
};

export function OfficeAgent({ agent, theme, isHovered, onHover }: Props) {
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [walkCycle, setWalkCycle] = useState(0);
  const design = GOD_DESIGNS[agent.name] || {};

  // Determine facing direction and animate walking
  useEffect(() => {
    if (agent.targetPosition) {
      const dx = agent.targetPosition.x - agent.position.x;
      if (dx > 0) setFacing('right');
      else if (dx < 0) setFacing('left');
      
      // Walk animation cycle
      const interval = setInterval(() => {
        setWalkCycle(c => (c + 1) % 4);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setWalkCycle(0);
    }
  }, [agent.targetPosition, agent.position]);

  const isMoving = !!agent.targetPosition;
  const isWorking = agent.state === 'working';

  // Animation offsets for walking
  const bobY = isMoving ? Math.sin(walkCycle * Math.PI / 2) * 2 : 0;
  const legOffset = isMoving ? Math.sin(walkCycle * Math.PI / 2) * 3 : 0;

  return (
    <div
      className="absolute z-40 cursor-pointer transition-transform"
      style={{
        left: agent.position.x - 20,
        top: agent.position.y - 40 + bobY,
        width: 40,
        height: 60,
        transform: isHovered ? 'scale(1.2)' : 'scale(1)',
        filter: isHovered ? `drop-shadow(0 0 8px ${theme.glow})` : 'none',
      }}
      onMouseEnter={onHover}
      onMouseLeave={() => {}}
    >
      {/* Container with facing direction */}
      <div style={{ transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}>
        
        {/* Aura/Glow */}
        {design.aura && (
          <div 
            className="absolute -inset-2 rounded-full animate-pulse opacity-40"
            style={{ 
              background: `radial-gradient(circle, ${design.aura}40 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Status indicator above head */}
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
          style={{ 
            backgroundColor: isWorking ? '#e94560' : isMoving ? '#00d9ff' : '#ffd700',
            boxShadow: `0 0 8px ${isWorking ? '#e94560' : isMoving ? '#00d9ff' : '#ffd700'}`,
          }}
        />

        {/* Crown for Kings */}
        {design.crown && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <svg width="16" height="8" viewBox="0 0 16 8">
              <path d="M0 8 L4 2 L8 6 L12 2 L16 8 Z" fill="#FFD700" stroke="#B8860B" strokeWidth="1"/>
              <circle cx="8" cy="3" r="2" fill="#FFA500"/>
            </svg>
          </div>
        )}

        {/* Helmet for Warriors */}
        {design.helmet && (
          <div 
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-3 rounded-t-sm"
            style={{ backgroundColor: theme.secondary, border: `1px solid ${theme.primary}` }}
          />
        )}

        {/* Wings for Hermes */}
        {design.wings && (
          <>
            <div className="absolute top-1 -left-2 w-3 h-4 bg-[#DAA520]/60 rounded-full animate-pulse" 
              style={{ animationDuration: '0.5s' }} />
            <div className="absolute top-1 -right-2 w-3 h-4 bg-[#DAA520]/60 rounded-full animate-pulse" 
              style={{ animationDuration: '0.5s', animationDelay: '0.25s' }} />
          </>
        )}

        {/* Head */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded"
          style={{ 
            backgroundColor: theme.accent,
            border: `1px solid ${theme.primary}`,
            boxShadow: `0 0 4px ${theme.glow}`,
          }}
        >
          {/* Eyes */}
          <div className="absolute top-1 left-0.5 w-1 h-1 bg-[#0d0d14] rounded-full" />
          <div className="absolute top-1 right-0.5 w-1 h-1 bg-[#0d0d14] rounded-full" />
        </div>

        {/* Body - God toga or human suit */}
        <div 
          className="absolute top-4 left-1/2 -translate-x-1/2 w-5 h-6 rounded-sm"
          style={{ 
            backgroundColor: theme.primary,
            border: `1px solid ${theme.secondary}`,
            boxShadow: `0 0 6px ${theme.glow}`,
          }}
        >
          {/* Toga drape line for AI gods */}
          {agent.type === 'ai' && (
            <div 
              className="absolute left-1 top-0 bottom-0 w-0.5"
              style={{ backgroundColor: theme.secondary }}
            />
          )}
          {/* Human tie */}
          {agent.type === 'human' && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1 w-1.5 h-3 bg-[#4169E1] rounded-sm" />
          )}
        </div>

        {/* Arms with walking animation */}
        <div 
          className="absolute top-5 w-2 h-4 rounded-sm"
          style={{ 
            left: '-3px',
            backgroundColor: theme.accent,
            transform: isMoving ? `translateY(${-legOffset}px)` : 'none',
            transition: 'transform 0.1s',
          }}
        />
        <div 
          className="absolute top-5 w-2 h-4 rounded-sm"
          style={{ 
            right: '-3px',
            backgroundColor: theme.accent,
            transform: isMoving ? `translateY(${legOffset}px)` : 'none',
            transition: 'transform 0.1s',
          }}
        />

        {/* Weapon */}
        {design.weapon === 'sword' && (
          <div 
            className="absolute top-6 -right-4 w-1 h-8 rounded-full"
            style={{ backgroundColor: '#C0C0C0', transform: 'rotate(15deg)' }}
          />
        )}
        {design.weapon === 'spear' && (
          <div 
            className="absolute -top-2 -right-3 w-0.5 h-12 rounded-full"
            style={{ backgroundColor: theme.primary }}
          />
        )}

        {/* Staff for magicians */}
        {design.staff && (
          <div 
            className="absolute top-4 -right-4 w-1 h-10 rounded-full"
            style={{ backgroundColor: theme.accent }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" 
              style={{ backgroundColor: theme.primary }} />
          </div>
        )}

        {/* Legs with walking animation */}
        <div 
          className="absolute top-10 w-1.5 h-5 rounded-sm"
          style={{ 
            left: '4px',
            backgroundColor: theme.secondary,
            transform: isMoving ? `translateY(${legOffset}px)` : 'none',
            transition: 'transform 0.1s',
          }}
        />
        <div 
          className="absolute top-10 w-1.5 h-5 rounded-sm"
          style={{ 
            right: '4px',
            backgroundColor: theme.secondary,
            transform: isMoving ? `translateY(${-legOffset}px)` : 'none',
            transition: 'transform 0.1s',
          }}
        />
      </div>

      {/* Hover tooltip */}
      {isHovered && (
        <div 
          className="absolute -top-16 left-1/2 -translate-x-1/2 bg-[#0d0d14] border rounded-lg px-3 py-2 whitespace-nowrap z-50"
          style={{ borderColor: theme.primary }}
        >
          <div className="text-[10px] text-[#eaeaea] font-bold">{agent.name}</div>
          <div className="text-[9px]" style={{ color: theme.primary }}>{agent.state}</div>
        </div>
      )}

      {/* Moving label */}
      {isMoving && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[8px] text-[#7a7aaa] bg-[#0d0d14]/90 px-2 py-0.5 rounded-full">
            {agent.name}
          </span>
        </div>
      )}
    </div>
  );
}
